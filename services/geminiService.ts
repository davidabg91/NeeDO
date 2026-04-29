
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
  imageBase64?: string | null
): Promise<{ text: string; analysis?: AIAnalysisResult; error?: string }> => {
  const ai = getAI();
  if (!ai) return { text: "", error: "AI услугата не е инициализирана." };
  
  try {
    const systemInstruction = `
        ТИ СИ ЕКСПЕРТЕН АСИСТЕНТ (NEEDO AI). ТВОЯТА ЦЕЛ Е ДА СЪЗДАДЕШ ПЕРФЕКТНАТА ОБЯВА ЗА УСЛУГА.
        
        >>> 1. АНАЛИЗ НА СНИМКАТА (СУПЕР ПРИОРИТЕТ) <<<
        Ако потребителят е качил снимка, ТЯ Е ТВОЯТ ГЛАВЕН ИЗТОЧНИК! 
        - Виж какво точно трябва да се направи (ремонт, почистване, монтаж).
        - Оцени мащаба на работата от снимката.
        
        >>> 2. ПРАВИЛА ЗА КОМУНИКАЦИЯ <<<
        - Твоята роля е да мислиш като МАЙСТОР/ПРОФЕСИОНАЛИСТ, който ще изпълни задачата.
        - ПИТАЙ САМО АКО ЛИПСВА КРИТИЧНА ИНФОРМАЦИЯ (напр. размери, вид материал, достъп до обекта).
        - НИКОГА НЕ ЗАДАВАЙ ВЪПРОСИ ЗА ЛОКАЦИЯ ИЛИ ВРЕМЕ - системата ги събира автоматично.
        - Ако информацията е достатъчна, НЕ ЗАДАВАЙ ВЪПРОСИ. Директно дай крайния JSON.

        >>> 3. СТРУКТУРА НА ОБЯВАТА <<<
        - ЗАГЛАВИЕ: Кратко, ясно и привличащо вниманието (напр. "Професионално боядисване на хол 25м2").
        - ОПИСАНИЕ: Структурирано, с булети, включващо всички детайли от текста и снимката на потребителя. Използвай професионален тон.

        >>> 4. КРАЕН РЕЗУЛТАТ (JSON) <<<
        Ако имаш достатъчно инфо, ВИНАГИ завършвай отговора си с този JSON формат:
        {"title": "...", "description": "...", "category": "..."}
        
        Ако трябва да питаш нещо, напиши въпроса си кратко и любезно.
    `;

    const contents = imageBase64 
      ? [systemInstruction, message, { inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } }] 
      : [systemInstruction, message];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });

    const text = response.text;
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
    return { text: cleanText || (analysis ? "" : text), analysis };
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
