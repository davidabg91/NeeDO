
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
  imageBase64?: string | null,
  history: { role: 'ai' | 'user', text: string }[] = []
): Promise<{ text: string; analysis?: AIAnalysisResult; error?: string }> => {
  const ai = getAI();
  if (!ai) return { text: "", error: "AI услугата не е инициализирана." };
  
  try {
    const systemInstruction = `
        ТИ СИ ЕКСПЕРТЕН АСИСТЕНТ (NEEDO AI). ТВОЯТА ЦЕЛ Е ДА СЪЗДАДЕШ ПЕРФЕКТНАТА ОБЯВА ЗА УСЛУГА.
        
        >>> ТВОЯТА ЗАДАЧА <<<
        1. АНАЛИЗИРАЙ СНИМКАТА: Тя е твоят основен източник. Виж порода, модел, повреда, размери.
        2. СЪБЕРИ ИНФО: Ако липсва нещо важно за майстора, ЗАДАЙ ЕДИН КРАТЪК ВЪПРОС.
        3. ОФОРМИ ОБЯВАТА: Когато си готов, СЪЗДАЙ JSON ОБЕКТ.
        
        >>> ПРАВИЛА ЗА ОФОРМЯНЕ НА ОБЯВАТА <<<
        - ПЕРСПЕКТИВА: Пиши от името на КЛИЕНТА (1-во лице). Напр. "Търся...", "Кучето ми е...", "Проблемът е...".
        - СТИЛ: Професионален, структуриран, с булети. Не преписвай чата, а го преработи в техническо задание.
        - БЕЗ ФРАЗИ КАТО: "От снимката се вижда", "Потребителят каза". Директно описвай обекта.
        
        >>> ФОРМАТ JSON <<<
        {"title": "Кратко и ясно заглавие", "description": "Подробно и професионално описание", "category": "Категория"}
        
        НИКОГА не питай за локация или време.
    `;

    // Map history and ensure the first message is prominent
    const contents: any[] = history.map((h, i) => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: (i === 0 ? "ОСНОВНА ЗАДАЧА: " : "") + h.text }]
    }));

    // Add current message and image
    const currentParts: any[] = [{ text: message }];
    if (imageBase64) {
      currentParts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
      contents: contents,
    });

    const text = response.text;
    let analysis: AIAnalysisResult | undefined;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch && contents.length > 1) {
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
    
    // Fallback logic if we are in Step 2 but no JSON
    if (contents.length > 1 && !analysis) {
      const mainTask = history[0]?.text || message;
      return { 
        text: "", 
        analysis: { 
          title: mainTask.substring(0, 50), 
          description: `Търся услуга за: ${mainTask}\nДетайли: ${message}`, 
          category: "Други" 
        } 
      };
    }

    if (analysis) return { text: "", analysis };
    return { text: cleanText || "Моля, уточнете техническите детайли.", analysis };
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
