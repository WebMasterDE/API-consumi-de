-- Migrazione: data_lettura da "timestamp" (ora italiana fissa UTC+1, senza ora legale) a "timestamptz" (istante reale)
-- Va lanciata a backend FERMO e prima di avviare la nuova versione.
--
-- Fino a questa versione il backend salvava sempre UTC+1, sia d'inverno sia d'estate:
-- togliere 1 ora e interpretare il risultato come UTC restituisce l'istante esatto per tutto lo storico.
-- Lo script è rilanciabile: se la colonna è già timestamptz non modifica i dati.

BEGIN;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'letture_inverter' AND column_name = 'data_lettura')
        = 'timestamp without time zone' THEN

        ALTER TABLE letture_inverter
            ALTER COLUMN data_lettura TYPE timestamptz
            USING (data_lettura - interval '1 hour') AT TIME ZONE 'UTC';

        RAISE NOTICE 'data_lettura convertita in timestamptz';
    ELSE
        RAISE NOTICE 'data_lettura è già timestamptz: nessuna modifica ai dati';
    END IF;
END $$;

-- Velocizza le query per tipo di dato e periodo (ultima lettura, grafico giornaliero, storico)
CREATE INDEX IF NOT EXISTS letture_inverter_id_dato_data_lettura_idx
    ON letture_inverter (id_dato, data_lettura);

COMMIT;
