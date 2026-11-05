-- Migrazione: totali giornalieri presi dallo storico Sungrow (getPowerStationPointDayMonthYearDataList).
-- Lo storico per la TV legge da qui invece che dalle letture ogni 5 minuti, che hanno buchi quando il backend è fermo.
-- La tabella viene riempita dal backend all'avvio (da gennaio dell'anno precedente) e poi aggiornata periodicamente.
-- Lo script è rilanciabile.

BEGIN;

CREATE TABLE IF NOT EXISTS storico_giornaliero (
    giorno date NOT NULL,                                       -- giorno dell'impianto (ora italiana)
    id_dato integer NOT NULL REFERENCES tipo_dato (id),
    valore double precision NOT NULL,                           -- totale del giorno, nell'unità di tipo_dato (Wh)
    aggiornato_il timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id_dato, giorno)
);

COMMIT;
