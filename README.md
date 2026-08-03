# Kalkulator inwestora

Aplikacja, która rozdziela miesięczną kwotę przeznaczoną na oszczędzanie między
IKE, IKZE, akcje, ETF-y, obligacje, złoto, lokaty i kryptowaluty — z podziałem
na 12 miesięcy, podsumowaniem rocznym i wykresami.

## Uruchomienie

```bash
npm install
npm run dev      # serwer deweloperski
npm run build    # build produkcyjny do dist/
npm run test     # testy silnika alokacji
npm run lint
```

## Jak to liczy

### Limity 2026

Limity wpłat są ogłaszane co roku jako wielokrotność prognozowanego przeciętnego
wynagrodzenia miesięcznego w gospodarce narodowej (na 2026 r. — 9 420 zł).
Trzymamy je w `src/domain/constants.ts`; aktualizacja raz w roku to dopisanie
wpisu do `LIMITS_BY_YEAR` i podbicie `CURRENT_YEAR`.

| Konto | Mnożnik | Limit 2026 |
| --- | --- | --- |
| IKE | 3,0 × | 28 260 zł |
| IKZE — umowa o pracę / zlecenie | 1,2 × | 11 304 zł |
| IKZE — działalność gospodarcza | 1,8 × | 16 956 zł |

### Strategie

**Równomiernie przez cały rok** — każdy miesiąc ma tę samą strukturę wpłat.
Konta emerytalne dostają 1/12 rocznego celu miesięcznie.

**Priorytetowo** — w pierwszych miesiącach cała kwota idzie na IKZE, po jego
domknięciu na IKE, a dopiero potem na resztę portfela zgodnie z proporcjami.

### IKE/IKZE jako kubełki neutralne

IKE i IKZE to zwykle tylko opakowanie na te same ETF-y, więc domyślnie są
traktowane jako osobne kubełki poza proporcjami: ich kwota wynika z rocznego
celu, a proporcje dzielą to, co zostanie. Po wyłączeniu tej opcji (tylko przy
rozkładzie równomiernym) konta mają własne wagi w proporcjach, a roczny cel
działa jako sufit — nadwyżka wraca do pozostałych kubełków.

### Zaokrąglanie

Po włączeniu zaokrąglania pozycje są ścinane w dół do pełnych 100 zł, a powstała
końcówka trafia w całości do wskazanego kubełka, dzięki czemu suma miesiąca
zawsze zgadza się z budżetem. Wyjątkiem jest wpłata domykająca roczny cel
IKE/IKZE — idzie co do grosza, bo inaczej resztówka poniżej 100 zł nigdy by się
nie zaksięgowała i limit pozostałby niedomknięty.

### Eksport do kalendarza

Zakładka „Miesiąc po miesiącu" pozwala pobrać plik `.ics` z planem wpłat
(Kalendarz Google → Ustawienia → Importuj i eksportuj → Importuj).

- Wybierasz dzień miesiąca i godzinę pierwszego wydarzenia.
- Rok jest zawsze rokiem limitów (`CURRENT_YEAR`), a plik zawsze pokrywa pełne
  12 miesięcy — od stycznia do grudnia, niezależnie od bieżącej daty. Dzięki temu
  wydarzenia w kalendarzu odpowiadają dokładnie tabeli planu i limitom, na
  których został policzony.
- Jeśli miesiąc nie ma wybranego dnia (np. 31 lutego), wpłata trafia na ostatni
  dzień tego miesiąca.
- Każdy kubełek z niezerową kwotą dostaje osobne wydarzenie — jedno po drugim
  co 5 minut, każde trwające 5 minut.
- Czas jest zapisany jako „pływający" (bez strefy), więc wydarzenie pojawi się
  o wybranej godzinie czasu lokalnego kalendarza.
- UID-y są deterministyczne, więc ponowny import aktualizuje istniejące
  wydarzenia zamiast tworzyć duplikaty.

### Precyzja

Cała alokacja liczona jest na groszach (liczby całkowite), a podział
proporcjonalny używa metody największych reszt. Suma pozycji w każdym miesiącu
zgadza się co do grosza z zadeklarowanym budżetem.

## Struktura

```
src/
  domain/        limity, definicje kubełków, silnik alokacji, schemat zod
  components/
    steps/       kolejne kroki formularza + widok wyników
    results/     tabela miesięczna, podsumowanie roczne, wykresy
    fields/      pola formularza
  hooks/         przeliczanie planu na bieżąco
  theme.ts       ciemny motyw MUI
```

Stan formularza jest zapisywany w `localStorage`, więc odświeżenie strony nie
gubi ustawień.

## Uwagi

Aplikacja jest narzędziem do planowania podziału wpłat, a nie poradą
inwestycyjną ani podatkową.
