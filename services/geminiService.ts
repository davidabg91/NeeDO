
import { GoogleGenAI } from "@google/genai";
import { AIAnalysisResult } from "../types";

// EXACT INITIALIZATION FROM THE BACKUP
let aiInstance: any = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  let apiKey = "";
  try {
    apiKey = (process.env as any).VITE_GEMINI_API_KEY || (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || "";
  } catch (e) {}
  
  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.length < 10) {
    console.warn("Gemini API Key is missing or invalid.");
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
  } catch (e) {
    console.error("Failed to initialize Gemini SDK:", e);
    return null;
  }
};

export const createTaskChatSession = () => {
  const ai = getAI();
  if (!ai) return null;
  // EXACT MODEL AND CONFIG FROM THE BACKUP
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
  const ai = getAI();
  if (!ai) return "По договаряне";
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
  chat: any, 
  message: string, 
  imageBase64?: string | null
): Promise<{ text: string; analysis?: AIAnalysisResult; error?: string }> => {
  if (!chat) return { text: "", error: "Чат сесията не е активна." };
  
  try {
    const parts: any[] = [];
    
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1]; 
      const mimeType = imageBase64.split(';')[0].split(':')[1] || "image/jpeg";
      parts.push({ inlineData: { mimeType, data: base64Data } });
    }

    if (message) {
      parts.push({ text: message });
    }

    const result = await chat.sendMessage({ 
      message: parts.length > 1 ? parts : (parts[0]?.text || message)
    });
    
    const text = result.text || "";

    // EXACT PARSING LOGIC FROM BACKUP
    let analysis: AIAnalysisResult | undefined;
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const potentialJson = text.substring(jsonStart, jsonEnd + 1);
        analysis = JSON.parse(potentialJson);
      } catch (e) {}
    }

    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();

    if (analysis) return { text: "", analysis };
    return { text: cleanText || (analysis ? "" : text), analysis };
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || String(error));
    return { text: "", error: "Грешка при връзката с AI." };
  }
};

export const getOfferHelpQuestion = async (taskTitle: string, taskDesc: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Имате ли опит?";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Ти си клиентът. Задача: "${taskTitle}". Описание: "${taskDesc}". Задай ЕДИН кратък въпрос към майстора за неговия ОПИТ или ИНСТРУМЕНТИ.`,
    });
    return response.text.trim();
  } catch (error) {
    return "Имате ли опит?";
  }
};

export const generateOfferPitch = async (taskTitle: string, providerAnswer: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return `Опит: ${providerAnswer}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Задача: "${taskTitle}". Майсторът отговори: "${providerAnswer}". Напиши кратко, професионално описание за оферта в 1-во лице. Без поздрави.`,
    });
    return response.text.trim();
  } catch (error) {
    return `Опит: ${providerAnswer}.`;
  }
};
