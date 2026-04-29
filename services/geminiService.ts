
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Initialize Gemini with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const createTaskChatSession = (): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      temperature: 0.2, 
      systemInstruction: `
        ТИ СИ ЕКСПЕРТЕН АСИСТЕНТ (NEEDO AI). ТВОЯТА ЦЕЛ Е ДА СЪЗДАДЕШ ПЕРФЕКТНАТА ОБЯВА ЗА УСЛУГА.

        >>> 1. АНАЛИЗ НА СНИМКАТА (СУПЕР ПРИОРИТЕТ) <<<
        Ако потребителят е качил снимка, ТЯ Е ТВОЯТ ГЛАВЕН ИЗТОЧНИК!
        Преди да питаш каквото и да е, АНАЛИЗИРАЙ СНИМКАТА ЗА ТЕХНИЧЕСКИ ДЕТАЙЛИ.

        >>> 2. ПРАВИЛА ЗА КОМУНИКАЦИЯ (СТРОГО ЗАБРАНЕНО) <<<
        !!! ВАЖНО: НИКОГА НЕ ЗАДАВАЙ ВЪПРОСИ ЗА:
        1. ЛОКАЦИЯ/АДРЕС ("Къде се намира?", "Град?", "Квартал?"). Това се взима автоматично от GPS-а на телефона.
        2. ВРЕМЕ/ДАТА ("Кога ви трябва?", "Спешно ли е?"). Това се избира от календар в следващата стъпка.
        
        >>> 3. КАКВО ДА ПИТАШ <<<
        - Питай ВЕДНАГА за технически детайли, които не се виждат на снимката (размери, специфични материали, етаж без асансьор).
        - Задавай само по 1 въпрос наведнъж.
        - МАКСИМУМ 3 ВЪПРОСА общо.

        >>> 4. КРАЕН РЕЗУЛТАТ (JSON) <<<
        Когато си готов, върни JSON обект. Описанието (description) трябва да е в 1-во лице.

        \`\`\`json
        {
          "title": "Заглавие",
          "description": "Описание",
          "category": "Категория"
        }
        \`\`\`
      `,
    },
  });
};

export const estimateTaskPrice = async (title: string, description: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Ти си експерт оценител на услуги в Европа. Задача: "${title}". Описание: "${description}". Дай ми само реалистичен ценови диапазон в ЕВРО (EUR). Формат: "XX - YY €". Ако не е възможно - "По договаряне".`,
    });
    return response.text.trim();
  } catch (error) {
    return "По договаряне";
  }
};

export const sendMessageToGemini = async (
  chat: Chat, 
  message: string, 
  imageBase64?: string | null
): Promise<{ text: string; analysis?: AIAnalysisResult }> => {
  try {
    const parts: Part[] = [];
    
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1]; 
      const mimeType = imageBase64.split(';')[0].split(':')[1];
      parts.push({ inlineData: { mimeType, data: base64Data } });
    }

    if (message) {
      parts.push({ text: message });
    }

    // FIX: Correct usage of chat.sendMessage according to guidelines
    // Passing the array of parts directly as the 'message' parameter
    const result: GenerateContentResponse = await chat.sendMessage({ 
      message: parts.length > 1 ? parts : (parts[0]?.text || message)
    });
    
    const text = result.text || "";

    // Safer parsing to avoid regex backtracking issues
    let analysis: AIAnalysisResult | undefined;
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const potentialJson = text.substring(jsonStart, jsonEnd + 1);
        analysis = JSON.parse(potentialJson);
      } catch (e) {
        console.warn("Failed to parse JSON from AI response");
      }
    }

    // Clean text for UI
    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();

    return { text: cleanText || (analysis ? "" : text), analysis };
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || String(error));
    return { text: "Възникна грешка при връзката с AI. Моля опитайте отново." };
  }
};

export const getOfferHelpQuestion = async (taskTitle: string, taskDesc: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Ти си клиентът. Задача: "${taskTitle}". Описание: "${taskDesc}". Задай ЕДИН кратък въпрос към майстора за неговия ОПИТ или ИНСТРУМЕНТИ.`,
    });
    return response.text.trim();
  } catch (error) {
    return "Имате ли професионален опит с този тип задачи?";
  }
};

export const generateOfferPitch = async (taskTitle: string, providerAnswer: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Задача: "${taskTitle}". Майсторът отговори: "${providerAnswer}". Напиши кратко, професионално описание за оферта в 1-во лице. Без поздрави.`,
    });
    return response.text.trim();
  } catch (error) {
    return `Разполагам с нужния опит: ${providerAnswer}.`;
  }
};
