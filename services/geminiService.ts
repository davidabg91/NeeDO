
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
      contents: `Оцени задача: "${title}". Дай само цена в EUR.`,
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
    const questionCount = Math.floor(history.length / 2);
    
    const identityInstruction = `
        ТИ СИ ЕКСПЕРТЕН АСИСТЕНТ НА NeeDO. ТВОЯТА МИСИЯ Е ДА СЪЗДАВАШ ПРОФЕСИОНАЛНИ ОБЯВИ.
        
        >>> ТВОЯТА РОЛЯ <<<
        - ТИ СИ МОСТЪТ между клиента и майстора.
        - АНАЛИЗИРАЙ текста и снимката заедно.
        - МИСЛИ КАТО МАЙСТОР: Питай само за детайлите, които са КРИТИЧНИ за определяне на цена и оферта (размери, материали, специфики).
        - БЪДИ КРАТЪК: Задавай само по един технически въпрос на български.
        
        >>> ТВОЯТА ЦЕЛ <<<
        - Събери важната информация и я оформи в професионална обява от 1-во лице ("Търся...", "Трябва ми...").
        - Обявата трябва да информира изпълнителите максимално добре.
        
        >>> СТРОГИ ПРАВИЛА <<<
        1. ВИНАГИ ОТГОВАРЯЙ НА БЪЛГАРСКИ.
        2. МАКСИМУМ 3 ВЪПРОСА. Ти си на въпрос ${questionCount + 1}.
        3. БЕЗ ОПИСАНИЯ НА СНИМКАТА И БЕЗ ЛЮБЕЗНОСТИ.
        4. САМО ВЪПРОС ИЛИ JSON: {"title": "...", "description": "...", "category": "..."}
    `;

    const contents: any[] = history.map((h, i) => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: (i === 0 ? identityInstruction + "\n" : "") + h.text }]
    }));

    const currentParts: any[] = [{ text: (contents.length === 0 ? identityInstruction + "\n" : "") + message }];
    if (imageBase64) {
      currentParts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: identityInstruction,
      contents: contents,
    });

    const text = response.text || "";
    let analysis: AIAnalysisResult | undefined;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch && (questionCount >= 1 || text.includes('category'))) {
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    if (questionCount >= 3 && !analysis) {
       const mainTask = history[0]?.text || message;
       analysis = { 
           title: mainTask.substring(0, 50), 
           description: `Търся услуга за: ${mainTask}\nДетайли: ${message}`, 
           category: "Други" 
       };
    }

    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
    if (analysis) return { text: "", analysis };
    return { text: cleanText || "Какви са детайлите?", analysis };
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || String(error));
    return { text: "", error: "Грешка. Моля, опитайте пак." };
  }
};

export const getOfferHelpQuestion = async (taskTitle: string, taskDesc: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Имате ли опит?";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Въпрос на български за: "${taskTitle}".`,
    });
    return response.text.trim();
  } catch (error) {
    return "Имате ли опит?";
  }
};

export const generateOfferPitch = async (taskTitle: string, providerAnswer: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return `Имам опит: ${providerAnswer}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Оферта на български за: "${taskTitle}". Отговор: "${providerAnswer}".`,
    });
    return response.text.trim();
  } catch (error) {
    return `Имам опит: ${providerAnswer}.`;
  }
};
