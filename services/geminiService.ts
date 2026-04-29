
import { GoogleGenAI } from "@google/genai";
import { AIAnalysisResult } from "../types";

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
  return getAI();
};

export const estimateTaskPrice = async (title: string, description: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "По договаряне";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Ти си експерт оценител на услуги в Европа. Задача: "${title}". Описание: "${description}". На база на пазарните цени за професионални услуги, дай ми само реалистичен ценови диапазон в ЕВРО (EUR). Формат: "XX - YY €". Ако не е възможно - "По договаряне".`,
    });
    return response.text.trim();
  } catch (error) {
    return "По договаряне";
  }
};

export const sendMessageToGemini = async (
  chat: any, 
  message: string, 
  imageBase64?: string | null,
  history: { role: 'ai' | 'user', text: string }[] = []
): Promise<{ text: string; analysis?: AIAnalysisResult; error?: string }> => {
  const ai = getAI();
  if (!ai) return { text: "", error: "AI услугата не е инициализирана." };
  
  try {
    const systemPrompt = `
        ТИ СИ ЕКСПЕРТЕН АСИСТЕНТ (NEEDO AI). ТВОЯТА ЦЕЛ Е ДА СЪЗДАДЕШ ОБЯВА В ТОЧНО 2 СТЪПКИ.
        
        >>> ПРАВИЛО НА ДВЕТЕ СТЪПКИ <<<
        1. ПЪРВО СЪОБЩЕНИЕ: Задай САМО ЕДИН технически въпрос (кг, модел, детайл). ЗАБРАНЕНО е да даваш JSON сега.
        2. ВТОРО СЪОБЩЕНИЕ (след отговор): СЪБЕРИ ВСИЧКО И ДАЙ JSON. ЗАБРАНЕНО е да питаш повече.
        
        >>> СТИЛ И ПЕРСПЕКТИВА <<<
        - Пиши винаги от 1-во лице ("Търся...", "Кучето ми е...", "Дисплеят ми е...").
        - НИКОГА не пиши "От снимката се вижда" или "Наблюдава се".
        - БЕЗ ЛЮБЕЗНОСТИ. БЕЗ СЪВЕТИ.
        
        >>> ФОРМАТ JSON <<<
        {"title": "...", "description": "...", "category": "..."}
    `;

    const contents: any[] = history.map(h => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));

    const currentMessageParts: any[] = [];
    if (contents.length === 0) {
      currentMessageParts.push({ text: systemPrompt + "\n\nПОТРЕБИТЕЛСКО ОПИСАНИЕ: " + message });
    } else {
      currentMessageParts.push({ text: message });
    }

    if (imageBase64) {
      currentMessageParts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } });
    }

    contents.push({
      role: 'user',
      parts: currentMessageParts
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });

    const text = response.text;
    
    let analysis: AIAnalysisResult | undefined;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    // Force JSON if we have history (meaning we already asked a question)
    if (jsonMatch && contents.length > 1) {
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
    
    // If we have history but AI failed to provide JSON, force create one
    if (contents.length > 1 && !analysis) {
       return { 
         text: "", 
         analysis: { 
           title: message.substring(0, 50), 
           description: history.map(h => h.text).join("\n") + "\n" + message, 
           category: "Други" 
         } 
       };
    }

    if (analysis) return { text: "", analysis };

    return { text: cleanText || "Моля, отговорете, за да завършим обявата.", analysis };
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || String(error));
    return { text: "", error: `Грешка от Google: ${error?.message || "Неуспешен анализ"}` };
  }
};

export const getOfferHelpQuestion = async (taskTitle: string, taskDesc: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Имате ли професионален опит с този тип задачи?";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Ти си клиентът. Задача: "${taskTitle}". Описание: "${taskDesc}". Задай ЕДИН кратък въпрос към майстора за неговия ОПИТ или ИНСТРУМЕНТИ.`,
    });
    return response.text.trim();
  } catch (error) {
    return "Имате ли професионален опит с този тип задачи?";
  }
};

export const generateOfferPitch = async (taskTitle: string, providerAnswer: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return `Разполагам с нужния опит: ${providerAnswer}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Задача: "${taskTitle}". Майсторът отговори: "${providerAnswer}". Напиши кратко, професионално описание за оферта в 1-во лице. Без поздрави.`,
    });
    return response.text.trim();
  } catch (error) {
    return `Разполагам с нужния опит: ${providerAnswer}.`;
  }
};
