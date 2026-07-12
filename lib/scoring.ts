const employeePoints: Record<string, number> = {
  "0 a 5 personas": 3,
  "6 a 10 personas": 8,
  "11 a 30 personas": 14,
  "31 a 50 personas": 19,
  "51 a 100 personas": 24,
  "101 a 250 personas": 29,
  "251 y mas personas": 35,
  "251 y más personas": 35,
};

const sectorPoints: Record<string, number> = {
  "11": 5, "21": 15, "22": 18, "23": 12, "31": 22, "32": 22, "33": 22,
  "43": 17, "46": 10, "48": 22, "49": 22, "51": 25, "52": 24, "53": 15,
  "54": 24, "55": 25, "56": 22, "61": 18, "62": 20, "71": 14, "72": 16,
  "81": 12, "93": 10,
};

export type ScoringInput = {
  employeeBand: string;
  sectorCode: string;
  email: string;
  phone: string;
  website: string;
  legalName: string;
};

export function calculateFirmographicScore(input: ScoringInput, source: "denue" | "uploaded") {
  let score = source === "denue" ? 5 : 3;
  const reasons = [source === "denue" ? "Establecimiento activo en DENUE (+5)" : "Lead aportado por VRAVURA (+3)"];
  const size = employeePoints[input.employeeBand] ?? 0;
  if (size) { score += size; reasons.push(`Tamaño ${input.employeeBand} (+${size})`); }
  const sector = sectorPoints[input.sectorCode] ?? 8;
  score += sector;
  reasons.push(`Potencial de automatización del sector ${input.sectorCode || "sin clasificar"} (+${sector})`);
  if (input.email) { score += 18; reasons.push("Correo empresarial disponible (+18)"); }
  if (input.phone) { score += 9; reasons.push("Teléfono disponible (+9)"); }
  if (input.website) { score += 10; reasons.push("Sitio web disponible (+10)"); }
  if (input.legalName) { score += 3; reasons.push("Razón social identificada (+3)"); }
  return { score: Math.min(score, 100), reasons: JSON.stringify(reasons) };
}

export function calculateIntentScore(eventType: string, arlLevel?: number | null) {
  const eventPoints: Record<string, number> = { opened: 5, started: 10, identified: 15, completed: 25 };
  const levelPoints = arlLevel ? Math.max(0, Math.min(15, arlLevel * 3)) : 0;
  return Math.min(40, (eventPoints[eventType] ?? 0) + levelPoints);
}
