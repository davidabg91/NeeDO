
import { GoogleGenerativeAI, ChatSession, GenerativeModel } from "@google/generative-ai";
import { AIAnalysisResult } from "../types";

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

const getAIModel = (): GenerativeModel | null => {
  if (model) return model;
  
  let apiKey = "";
  try {
    apiKey = (process.env as any).VITE_GEMINI_API_KEY || (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || "";
  } catch (e) {}
  
  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.length < 10) {
    console.warn("Gemini API Key is missing or invalid.");
    return null;
  }
  
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `
        ТИ СИ ЕКСПЕРТЕН АСИСТЕНТ (NEEDO AI). ТВОЯТА ЦЕЛ Е ДА СЪЗДАДЕШ ПЕРФЕКТНАТА ОБЯВА ЗА УСЛУГА.
        >>> 1. АНАЛИЗ НА СНИМКАТА (СУПЕР ПРИОРИТЕТ) <<<
        Ако потребителят е качил снимка, ТЯ Е ТВОЯТ ГЛАВЕН ИЗТОЧНИК!
        >>> 2. ПРАВИЛА ЗА КОМУНИКАЦИЯ <<<
        НИКОГА НЕ ЗАДАВАЙ ВЪПРОСИ ЗА ЛОКАЦИЯ ИЛИ ВРЕМЕ.
        >>> 4. КРАЕН РЕЗУЛТАТ (JSON) <<<
        Върни JSON обект: {"title": "Заглавие", "description": "Описание", "category": "Категория"}
      `,
      generationConfig: {
        temperature: 0.2,
      }
    });
    console.log("Gemini AI Initialized with model: gemini-1.5-flash");
    return model;
  } catch (e) {
    console.error("Failed to initialize Gemini SDK:", e);
    return null;
  }
};

export const createTaskChatSession = (): ChatSession | null => {
  const model = getAIModel();
  if (!model) return null;
  
  return model.startChat({
    history: [],
    generationConfig: {
      temperature: 0.2,
    }
  });
};

export const estimateTaskPrice = async (title: string, description: string): Promise<string> => {
  const model = getAIModel();
  if (!model) return "По договаряне";
  try {
    const prompt = `Ти си експерт оценител на услуги в Европа. Задача: "${title}". Описание: "${description}". Дай ми само реалистичен ценови диапазон в ЕВРО (EUR). Формат: "XX - YY €". Ако не е възможно - "По договаряне".`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    return "По договаряне";
  }
};

export const sendMessageToGemini = async (
  chat: ChatSession | null, 
  message: string, 
  imageBase64?: string | null
): Promise<{ text: string; analysis?: AIAnalysisResult; error?: string }> => {
  const model = getAIModel();
  if (!chat || !model) return { text: "", error: "AI услугата не е инициализирана." };
  
  try {
    const parts: any[] = [];
    
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1]; 
      const mimeType = imageBase64.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    if (message) {
      parts.push(message);
    }

    // System instruction passed as first message if chat is new, or we could have set it in getGenerativeModel
    // For simplicity, we'll just send the parts
    const result = await chat.sendMessage(parts);
    const text = result.response.text();

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

    let cleanText = text.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
    return { text: cleanText || (analysis ? "" : text), analysis };
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || String(error));
    return { text: "", error: `Грешка: ${error?.message || "Неуспешна връзка с ИИ"}` };
  }
};

export const getOfferHelpQuestion = async (taskTitle: string, taskDesc: string): Promise<string> => {
  const model = getAIModel();
  if (!model) return "Имате ли професионален опит с този тип задачи?";
  try {
    const prompt = `Ти си клиентът. Задача: "${taskTitle}". Описание: "${taskDesc}". Задай ЕДИН кратък въпрос към майстора за неговия ОПИТ или ИНСТРУМЕНТИ.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    return "Имате ли професионален опит с този тип задачи?";
  }
};

export const generateOfferPitch = async (taskTitle: string, providerAnswer: string): Promise<string> => {
  const model = getAIModel();
  if (!model) return `Разполагам с нужния опит: ${providerAnswer}.`;
  try {
    const prompt = `Задача: "${taskTitle}". Майсторът отговори: "${providerAnswer}". Напиши кратко, професионално описание за оферта в 1-во лице. Без поздрави.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    return `Разполагам с нужния опит: ${providerAnswer}.`;
  }
};
