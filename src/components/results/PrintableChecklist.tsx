import { createPortal } from 'react-dom';

import type { CalculationResult } from '../../domain/allocate';
import { ASSETS } from '../../domain/assets';
import type { Checklist } from '../../domain/checklist';
import { darkenForPrint } from '../../utils/color';
import { formatMoney, formatMoneyShort } from '../../utils/format';

export type PrintColorMode = 'color' | 'mono';

interface PrintableChecklistProps {
  result: CalculationResult;
  checklist: Checklist;
  colorMode: PrintColorMode;
}

/**
 * Arkusz wydruku. Renderowany portalem prosto do <body>, żeby przy drukowaniu
 * dało się ukryć całą aplikację (#root) i zostawić samą listę — style w
 * `src/print.css`.
 */
export function PrintableChecklist({ result, checklist, colorMode }: PrintableChecklistProps) {
  const summaryRows = result.summary.filter((row) => row.amount > 0);
  const half = Math.ceil(summaryRows.length / 2);
  const summaryPairs = summaryRows
    .slice(0, half)
    .map((row, index) => [row, summaryRows[half + index]] as const);
  const inColor = colorMode === 'color';

  // W trybie kolorowym kropka zostaje w oryginalnym kolorze (mały znacznik),
  // a tekst dostaje przyciemnioną wersję, żeby dało się go czytać na papierze.
  const dot = (color: string) => (inColor ? { background: color } : undefined);
  const label = (color: string) => (inColor ? { color: darkenForPrint(color) } : undefined);

  return createPortal(
    <div className={`print-sheet${inColor ? '' : ' print-sheet--mono'}`}>
      <header className="ps-head">
        <div>
          <h1 className="ps-title">Plan wpłat {checklist.year}</h1>
          <p className="ps-subtitle">Wpłaty {checklist.dayOfMonth}. dnia każdego miesiąca</p>
        </div>
        <div className="ps-facts">
          <span>
            Budżet: <strong>{formatMoneyShort(result.budgetTotal)}</strong>
          </span>
          <span>
            Miesięcznie: <strong>{formatMoneyShort(result.budgetTotal / 12)}</strong>
          </span>
          <span>
            Pozycji: <strong>{checklist.itemCount}</strong>
          </span>
        </div>
      </header>

      <div className="ps-grid">
        {checklist.months.map((month) => (
          <section className="ps-month" key={month.month}>
            <div className="ps-month__head">
              <span className="ps-month__name">{month.monthName}</span>
              <span className="ps-month__date">
                {month.dateLabel}
                <span
                  className={`ps-month__weekday${
                    month.weekend ? ' ps-month__weekday--weekend' : ''
                  }`}
                >
                  {month.weekday}
                </span>
              </span>
            </div>

            {month.items.map((item) => (
              <div className="ps-row" key={item.key}>
                <span className="ps-box" />
                <span className="ps-row__label" style={label(item.color)}>
                  <span className="ps-dot" style={dot(item.color)} />
                  {item.label}
                </span>
                <span className="ps-row__amount">{formatMoney(item.amount)}</span>
              </div>
            ))}

            <div className="ps-month__total">
              <span>Razem</span>
              <span>{formatMoney(month.total)}</span>
            </div>

            {month.shortened ? (
              <p className="ps-month__note">
                Miesiąc nie ma {checklist.dayOfMonth}. dnia — wpłata na ostatni dzień.
              </p>
            ) : null}
            {month.unallocated > 0 ? (
              <p className="ps-month__note">
                Nierozdysponowane: {formatMoney(month.unallocated)}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <section className="ps-summary">
        <h2 className="ps-summary__title">Podsumowanie roczne</h2>
        {/* Dwie kolumny obok siebie — podsumowanie zajmuje o połowę mniej wysokości. */}
        <table className="ps-table">
          <tbody>
            {summaryPairs.map(([left, right]) => (
              <tr key={left.key}>
                <td>
                  <span className="ps-row__label" style={label(ASSETS[left.key].color)}>
                    <span className="ps-dot" style={dot(ASSETS[left.key].color)} />
                    {ASSETS[left.key].label}
                  </span>
                </td>
                <td>{formatMoney(left.amount)}</td>
                <td className="ps-table__gap" />
                <td>
                  {right ? (
                    <span className="ps-row__label" style={label(ASSETS[right.key].color)}>
                      <span className="ps-dot" style={dot(ASSETS[right.key].color)} />
                      {ASSETS[right.key].label}
                    </span>
                  ) : null}
                </td>
                <td>{right ? formatMoney(right.amount) : null}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Razem w roku</td>
              <td>{formatMoney(result.investedTotal)}</td>
              <td className="ps-table__gap" />
              <td>Miesięcznie</td>
              <td>{formatMoney(result.budgetTotal / 12)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer className="ps-foot">
        <span>Kalkulator inwestora · plan na {checklist.year} r.</span>
      </footer>
    </div>,
    document.body,
  );
}
