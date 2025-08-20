/**
 * API: /api/openai/chat
 * 
 * Endpoint para comunicação com o modelo OpenAI GPT-4o.
 * Este endpoint utiliza streaming para respostas em tempo real.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 22/05/2025
 */

import { openai } from "@ai-sdk/openai";
import { devLog } from "@/lib/utils/productionLogger";
import { convertToCoreMessages, streamText } from "ai";

// Definimos que este endpoint usa o runtime Edge
export const runtime = "edge";

/**
 * Endpoint POST para conversação com o ChatGPT
 */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Mensagens não fornecidas ou inválidas",
          errorCode: "VALIDATION_ERROR"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    // Configura e inicia o streaming de texto
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });

    // Retorna o stream de dados como resposta
    return result.toDataStreamResponse();
  } catch (error) {
    devLog.error("[OPENAI-CHAT] Erro ao processar chat:", error);
    
    // Tratamento de erro para o runtime Edge
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno ao processar chat",
        errorCode: "OPERATION_FAILED"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

/**
 * Endpoint OPTIONS para informações sobre a API
 */
export async function OPTIONS() {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        endpoint: "/api/openai/chat",
        description: "Endpoint para comunicação com o modelo OpenAI GPT-4o",
        method: "POST",
        requiredFields: ["messages"],
        format: {
          messages: [
            { role: "user", content: "Olá, como posso te ajudar com meu projeto solar?" }
          ]
        }
      }
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
