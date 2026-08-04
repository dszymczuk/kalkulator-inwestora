import { createPortal } from 'react-dom';

import type { CalculationResult } from '../../domain/allocate';
import { ASSETS } from '../../domain/assets';
import type { Checklist } from '../../domain/checklist';
import { darkenForPrint } from '../../utils/color';
import { formatMoney, formatPercent } from '../../utils/format';

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
  const inColor = colorMode === 'color';

  // W trybie kolorowym kropka zostaje w oryginalnym kolorze (mały znacznik),
  // a tekst dostaje przyciemnioną wersję, żeby dało się go czytać na papierze.
  const dot = (color: string) => (inColor ? { background: color } : undefined);
  const label = (color: string) => (inColor ? { color: darkenForPrint(color) } : undefined);

  return createPortal(
    <div className={`print-sheet${inColor ? '' : ' print-sheet--mono'}`}>
      <header className="ps-head">
        <h1 className="ps-title">Plan wpłat {checklist.year}</h1>
        <p className="ps-subtitle">
          Lista do odhaczania — wpłaty {checklist.dayOfMonth}. dnia każdego miesiąca.
        </p>
        <div className="ps-facts">
          <span>
            Budżet roczny: <strong>{formatMoney(result.budgetTotal)}</strong>
          </span>
          <span>
            Miesięcznie: <strong>{formatMoney(result.budgetTotal / 12)}</strong>
          </span>
          <span>
            Pozycji do odhaczenia: <strong>{checklist.itemCount}</strong>
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
                <span className="ps-row__amount">
                  {formatMoney(item.amount)}
                  <span className="ps-row__share">{formatPercent(item.share)}</span>
                </span>
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
        <table className="ps-table">
          <thead>
            <tr>
              <th>Kubełek</th>
              <th>Kwota roczna</th>
              <th>Udział</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => (
              <tr key={row.key}>
                <td>
                  <span className="ps-row__label" style={label(ASSETS[row.key].color)}>
                    <span className="ps-dot" style={dot(ASSETS[row.key].color)} />
                    {ASSETS[row.key].label}
                  </span>
                </td>
                <td>{formatMoney(row.amount)}</td>
                <td>{formatPercent(row.actualShare)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Razem</td>
              <td>{formatMoney(result.investedTotal)}</td>
              <td>{formatPercent(result.investedTotal > 0 ? 100 : 0)}</td>
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
