
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
      contents: `Ти си експерт оценител на услуги в Европа. Задача: "${title}". Описание: "${description}". На база пазарни цени, дай реалистичен диапазон в ЕВРО (EUR). Формат: "XX - YY €".`,
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
        ТИ СИ ЕКСПЕРТЕН КООРДИНАТОР (NEEDO AI). ТВОЯТА ЦЕЛ Е ДА СЪЗДАДЕШ ТЕХНИЧЕСКО ЗАДАНИЕ ЗА ОБЯВА.
        
        >>> ТВОЯТА ЛОГИКА <<<
        1. СВЪРЖИ ТЕКСТА И СНИМКАТА: Ако потребителят каже "смяна на дограма" и качи снимка, ти трябва да видиш прозореца.
        2. МИСЛИ КАТО ИЗПЪЛНИТЕЛ: Какво ти трябва за цена? (напр. размери, вид материал, брой).
        3. СТЪПКА 1 (Първо съобщение): Ако липсва важна инфо, задай ЕДИН КРАТЪК И ЯСЕН ВЪПРОС. БЕЗ JSON.
        4. СТЪПКА 2 (Второ съобщение): Събери всичко и върни JSON. БЕЗ ПОВЕЧЕ ВЪПРОСИ.
        
        >>> ПРАВИЛА ЗА ОБЯВАТА <<<
        - ПЕРСПЕКТИВА: Пиши от името на клиента (1-во лице). Напр. "Търся...", "Трябва ми...".
        - СТИЛ: Професионален, с ясни параметри и детайли от снимката.
        - БЕЗ ПРАЗНИ ПРИКАЗКИ: Никакви любезности и обяснения. Само въпрос или JSON.
        
        >>> ФОРМАТ JSON <<<
        {"title": "Заглавие на задачата", "description": "Професионално описание", "category": "Категория"}
    `;

    const contents: any[] = history.map((h, i) => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: (i === 0 ? "ОСНОВНА ЗАДАЧА: " : "") + h.text }]
    }));

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
    
    // Logic: Force JSON if we have history or if it's the second user interaction
    if (jsonMatch && contents.length > 1) {
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
    
    // If we have history but no JSON, or if it's taking too long, force finalize
    if (contents.length > 2 && !analysis) {
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
    return { text: cleanText || "Моля, дайте малко повече информация.", analysis };
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || String(error));
    return { text: "", error: `Грешка от Google: ${error?.message || "Неуспешен анализ"}` };
  }
};

export const getOfferHelpQuestion = async (taskTitle: string, taskDesc: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Имате ли опит?";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Задай кратък въпрос към майстора за задача: "${taskTitle}".`,
    });
    return response.text.trim();
  } catch (error) {
    return "Имате ли професионален опит?";
  }
};

export const generateOfferPitch = async (taskTitle: string, providerAnswer: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return `Разполагам с нужния опит: ${providerAnswer}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Напиши кратка оферта от 1-во лице за задача: "${taskTitle}". Отговор на майстора: "${providerAnswer}". Без поздрави.`,
    });
    return response.text.trim();
  } catch (error) {
    return `Разполагам с нужния опит: ${providerAnswer}.`;
  }
};
