
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
      contents: `Ти си експерт оценител на услуги в България. 
      Задача: "${title}". 
      Описание: "${description}". 
      Дай само реалистичен ценови диапазон в Български лева (BGN). Формат: "XX - YY лв.". Без друг текст!`,
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
        ТИ СИ ЕКСПЕРТЕН АСИСТЕНТ НА NeeDO. 
        
        ПРАВИЛА ЗА "АГРЕСИВНА ДЕДУКЦИЯ":
        Когато анализираш снимка, ти трябва да ПОЗНАЕШ техническите детайли, вместо да питаш за тях.
        1. ЗА ЖИВОТНИ: Виждаш породата? -> Автоматично определи теглото (напр. Лабрадор ~30кг). Не питай!
        2. ЗА ТЕХНИКА/КОЛИ: Определи марка и модел визуално.
        3. ЗА РЕМОНТИ: Оцени квадратурата или сложността визуално.
        
        ПРАВИЛА ЗА ПОВЕДЕНИЕ:
        - ЕДИН ПО ЕДИН: Задавай само по ЕДИН въпрос в съобщение.
        - БЕЗ ЛЮБЕЗНОСТИ: Бъди кратък, точен и директен.
        - ПЕРСПЕКТИВА: Пиши обявата от 1-во лице ("Търся...", "Трябва ми...").
        - КАТЕГОРИИ: Използвай само от този списък: [Домашен майстор, ВиК Услуги, Електро услуги, Строителство, Почистване, Монтаж на мебели, Боядисване, Ключарски услуги, Транспорт, Пътна помощ, Авто услуги, Автомивка, Ремонт на техника, IT Услуги, Дизайн, Уроци, Преводи, Красота, Спорт, Гледане на деца, Домашни любимци, Градинарство, Събития, Фотография, Счетоводство, Други]

        ФИНАЛИЗИРАНЕ:
        Когато си готов, върни JSON: {"title": "...", "description": "...", "category": "..."}
        В описанието ВКЛЮЧИ ВСИЧКИ СВОИ ДЕДУКЦИИ (кг, марки, размери).
    `;

    const contents: any[] = history.map((h, i) => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: (i === 0 ? "СИСТЕМНИ ПРАВИЛА: " + systemInstruction + "\n\n" : "") + h.text }]
    }));

    const currentParts: any[] = [{ text: message }];
    if (imageBase64) {
      const mimeType = imageBase64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
      const base64Data = imageBase64.split(',')[1];
      currentParts.push({ inlineData: { mimeType, data: base64Data } });
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

    const text = response.text || "";
    let analysis: AIAnalysisResult | undefined;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch && contents.length > 1) {
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
    if (analysis) return { text: "", analysis };
    return { text: cleanText || "Какви са детайлите?", analysis };
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || String(error));
    return { text: "", error: "Техническа грешка." };
  }
};

export const getOfferHelpQuestion = async (taskTitle: string, taskDesc: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Имате ли опит?";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Въпрос за: "${taskTitle}".`,
    });
    return response.text.trim();
  } catch (error) {
    return "Имате ли опит?";
  }
};

export const generateOfferPitch = async (taskTitle: string, providerAnswer: string): Promise<string> => {
  const ai = aiInstance;
  if (!ai) return `Имам опит: ${providerAnswer}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Оферта за: "${taskTitle}". Отговор: "${providerAnswer}".`,
    });
    return response.text.trim();
  } catch (error) {
    return `Имам опит: ${providerAnswer}.`;
  }
};
