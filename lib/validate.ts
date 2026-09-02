import { z } from "zod";

export const telemetrySchema = z
  .object({
    device_id: z.string().min(1, "device_id wajib"),
    temperature: z.number({ message: "temperature wajib number" }),
    humidity: z.number({ message: "humidity wajib number" }),
    gas_value: z
      .number({ message: "gas_value wajib number" })
      .int("gas_value harus integer")
      .min(0, "gas_value minimal 0")
      .max(4095, "gas_value maksimal 4095"),
    fan_on: z.boolean().optional().default(false),
    buzzer_on: z.boolean().optional().default(false),
    led_red_on: z.boolean().optional().default(false),
    led_green_on: z.boolean().optional().default(false),
  })
  .refine((v) => !Number.isNaN(v.temperature), {
    message: "temperature tidak boleh NaN",
    path: ["temperature"],
  })
  .refine((v) => !Number.isNaN(v.humidity), {
    message: "humidity tidak boleh NaN",
    path: ["humidity"],
  });

export type TelemetryInput = z.infer<typeof telemetrySchema>;
