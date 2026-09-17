// Filtro por dia exato e/ou por mês, reaproveitado em toda tela do
// Financeiro. Os dois são independentes — preencher só um já filtra.
export function DateFilterBar({
  day, month, onDayChange, onMonthChange, dayLabel = "Dia", monthLabel = "Mês",
}: {
  day: string;
  month: string;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  dayLabel?: string;
  monthLabel?: string;
}) {
  return (
    <>
      <input
        type="date" className="input" style={{ width: "auto" }} value={day}
        onChange={(e) => onDayChange(e.target.value)} title={`Filtrar por ${dayLabel.toLowerCase()}`}
      />
      <input
        type="month" className="input" style={{ width: "auto" }} value={month}
        onChange={(e) => onMonthChange(e.target.value)} title={`Filtrar por ${monthLabel.toLowerCase()}`}
      />
      {(day || month) && (
        <button className="btn sm ghost" onClick={() => { onDayChange(""); onMonthChange(""); }}>Limpar datas</button>
      )}
    </>
  );
}
