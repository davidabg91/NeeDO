
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Initialize Gemini with the API key from environment variables
// ensuring it uses the user's configured plan (Pro/Free) correctly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const createTaskChatSession = (): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      temperature: 0.1, // Low temperature for strict rule adherence
      systemInstruction: `
        ТИ СИ ЕКСПЕРТЕН ВИЗУАЛЕН АНАЛИЗАТОР И ЛОГИЧЕСКИ МОДУЛ ЗА СЪБИРАНЕ НА ДАННИ. 
        ЦЕЛ: Създай перфектна задача за изпълнител, като питаш потребителя ВЪЗМОЖНО НАЙ-МАЛКО въпроси.

        ВАЖНО: ИЗПОЛЗВАЙ СНИМКАТА КАТО ОСНОВЕН ИЗТОЧНИК НА ИСТИНА.

        ПРАВИЛА ЗА "АГРЕСИВНА ДЕДУКЦИЯ" (СУПЕР ВАЖНО):
        Когато анализираш снимка, ти трябва да ПОЗНАЕШ техническите детайли, вместо да питаш за тях.
        
        1. **ЗА ЖИВОТНИ (КУЧЕТА/КОТКИ):**
           - Виждаш породата? -> АВТОМАТИЧНО ОПРЕДЕЛИ ТЕГЛОТО.
           - Пример: Виждаш Голдън Ретривър. НЕ ПИТАЙ "Колко тежи?". ТИ ЗНАЕШ, че е средно 30-35кг. Запиши го директно в описанието.
           - Пример: Виждаш Йорки. ТИ ЗНАЕШ, че е 2-3кг. Не питай.
           - Питай само за невидими неща (напр. "Агресивно ли е?").

        2. **ЗА АВТОМОБИЛИ:**
           - Виждаш колата? -> АВТОМАТИЧНО ОПРЕДЕЛИ МАРКА И МОДЕЛ.
           - Пример: Виждаш BMW E46. НЕ ПИТАЙ "Каква е колата?". Запиши "BMW 3-та серия (E46)" в описанието.
        
        3. **ЗА РЕМОНТИ/ПОЧИСТВАНЕ:**
           - Оцени квадратурата визуално. Ако е една стая на снимката, напиши "Стандартна стая ~15-20кв.м". Не карай потребителя да мери, ако не е критично.

        ПРАВИЛА ЗА ПОВЕДЕНИЕ:
        1. **ЕДИН ПО ЕДИН (1-by-1):** 
           - Задавай СТРИКТНО САМО ПО ЕДИН въпрос в съобщение.
        
        2. **БЕЗ ЛЮБЕЗНОСТИ:** Бъди кратък, точен и директен. Без "Здравейте", "Разбирам".

        3. **КАТЕГОРИИ:**
           Когато определяш категория, избери НАЙ-ПОДХОДЯЩАТА от този списък. Не си измисляй нови.
           Списък: [
             "Домашен майстор", "ВиК Услуги", "Електро услуги", "Строителство", "Почистване", "Монтаж на мебели", 
             "Боядисване", "Ключарски услуги", "Транспорт", "Пътна помощ", "Авто услуги", "Автомивка", 
             "Ремонт на техника", "IT Услуги", "Дизайн", "Уроци", "Преводи", "Красота", "Спорт", 
             "Гледане на деца", "Домашни любимци", "Градинарство", "Събития", "Фотография", "Счетоводство", "Други"
           ]

        4. **ФИНАЛИЗИРАНЕ:**
           - Когато имаш достатъчно данни (от снимката + 1-2 въпроса), върни JSON.
           - В полето "description" на JSON-а ТРЯБВА да включиш своите дедукции (напр. "Кучето е Лабрадор, около 30кг, спокойно на вид.").

        \`\`\`json
        {
          "title": "Кратко заглавие (напр. Разходка на Лабрадор)",
          "description": "Пълно описание: Търся човек за... (ТУК ВКЛЮЧИ ВСИЧКО, КОЕТО ВИДЯ НА СНИМКАТА: КГ, МАРКИ, МОДЕЛИ, РАЗМЕРИ)",
          "category": "Категория (ЕДНА ОТ ГОРНИЯ СПИСЪК)"
        }
        \`\`\`
      `,
    },
  });
};

export const estimateTaskPrice = async (title: string, description: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Ти си експерт оценител на услуги в България. 
      Задача: "${title}". 
      Описание: "${description}". 
      
      Дай ми само и единствено реалистичен ценови диапазон в български лева (BGN) за тази услуга. 
      Форматът трябва да е като "XX - YY лв." или "XX лв.".
      Ако услугата е твърде специфична или невъзможна за оценка, напиши "По договаряне".
      Не пиши нищо друго освен цената.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Price estimation failed", error);
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
    
    // Add image if present - Image MUST come before text for best multimodal performance
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1]; 
      const mimeType = imageBase64.split(';')[0].split(':')[1];

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        } as any
      });
    }

    // Add text message
    if (message) {
      parts.push({ text: message });
    }

    // Send message to Gemini
    // Cast to any because chat.sendMessage expects specific structure that might vary by version
    const result: GenerateContentResponse = await chat.sendMessage({ message: parts } as any);
    
    const text = result.text || "";

    // Check for JSON block
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    
    // Fallback: Try to find a JSON object if no markdown block
    if (!jsonMatch) {
        jsonMatch = text.match(/(\{[\s\S]*\})/);
    }

    let analysis: AIAnalysisResult | undefined;

    if (jsonMatch && jsonMatch[1]) {
      try {
        // Clean potential trailing commas or bad formatting if needed, but usually Parse is strict
        analysis = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse AI JSON", e);
      }
    }

    // Remove the JSON block from the text shown to user
    // Be aggressive in cleaning to avoid showing raw JSON to user
    let cleanText = text.replace(/```json[\s\S]*?```/, "")
                        .replace(/```[\s\S]*?```/, "") // catch generic blocks
                        .trim();
    
    // If the whole text was JSON (fallback case), cleanText might be empty or weird characters
    if (analysis && cleanText.includes('{')) {
        cleanText = ""; 
    }

    return {
      text: cleanText, 
      analysis
    };
  } catch (error: any) {
    // Identify Quota/Rate Limit errors (429, Resource Exhausted)
    let isQuotaError = false;

    // Robust error checking without JSON.stringify to avoid circular structure errors
    try {
        const status = error?.status || error?.error?.code;
        const errorStatus = error?.error?.status;
        const message = error?.message || '';

        if (
            status === 429 || 
            errorStatus === 'RESOURCE_EXHAUSTED' ||
            message.includes('429') || 
            message.includes('quota') || 
            message.includes('RESOURCE_EXHAUSTED')
        ) {
            isQuotaError = true;
        }
    } catch(e) {
        console.warn("Error checking failed", e);
    }

    if (isQuotaError) {
       // Use console.warn instead of console.error for known quota limits to avoid alarm
       console.warn("Gemini API Quota Exceeded.");
       return { text: "⚠️ Достигнат е лимитът на заявките към AI. Моля, изчакайте малко и опитайте отново." };
    }
    
    // Log unexpected errors
    console.error("Gemini API Error:", error);
    
    return { text: "Възникна техническа грешка при връзката с AI асистента. Моля опитайте отново." };
  }
};
