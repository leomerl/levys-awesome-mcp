import { z } from 'zod';

export const MCPResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

export const ToolListResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.object({
    tools: z.array(z.object({
      name: z.string(),
      description: z.string(),
      inputSchema: z.object({
        type: z.literal('object'),
        properties: z.record(z.any()),
        required: z.array(z.string()).optional()
      })
    }))
  })
});

export const ToolCallResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.object({
    content: z.array(z.object({
      type: z.string(),
      text: z.string()
    })),
    isError: z.boolean().optional()
  }).optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

export function validateMCPResponse(data: unknown) {
  return MCPResponseSchema.parse(data);
}

export function validateToolListResponse(data: unknown) {
  return ToolListResponseSchema.parse(data);
}

export function validateToolCallResponse(data: unknown) {
  return ToolCallResponseSchema.parse(data);
}