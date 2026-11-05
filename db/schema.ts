import { sql } from 'drizzle-orm';
import { doublePrecision, foreignKey, index, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// Tabelle esistenti, allineate allo schema reale del DB (public). Per riverificarle: npm run db:pull
// letture_inverter.data_lettura è timestamptz (vedi db/migrations); not_valid_tokens.data_scadenza è un
// "timestamp without time zone" che drizzle legge e scrive come UTC.

export const dispositivi = pgTable('dispositivi', {
    // Nel DB il default è nextval('dispositivi'::regclass), che non è una sequence: va corretto con
    // ALTER TABLE dispositivi ALTER COLUMN id SET DEFAULT nextval('dispositivi_id_seq'::regclass);
    id: integer('id').primaryKey().default(sql`nextval('dispositivi_id_seq'::regclass)`),
    id_dispositivo: varchar('id_dispositivo').notNull(),
});

export const tipo_dato = pgTable('tipo_dato', {
    id: integer('id').primaryKey().default(sql`nextval('tipo_dato_id_seq'::regclass)`),
    codice: varchar('codice').notNull(),
    nome: varchar('nome'),
    unita_misura: varchar('unita_misura').notNull().default('Wh'),
    icona: varchar('icona'),
});

export const letture_inverter = pgTable('letture_inverter', {
    id: integer('id').primaryKey().default(sql`nextval('letture_inverter_id_seq'::regclass)`),
    id_dato: integer('id_dato').notNull(),
    valore: doublePrecision('valore'),
    data_lettura: timestamp('data_lettura', { withTimezone: true }).notNull(),
}, (table) => [
    index('letture_inverter_id_dato_data_lettura_idx').on(table.id_dato, table.data_lettura),
    foreignKey({
        name: 'letture_inverter_tipo_dato_id_fk',
        columns: [table.id_dato],
        foreignColumns: [tipo_dato.id],
    }),
]);

export const not_valid_tokens = pgTable('not_valid_tokens', {
    id: serial('id').primaryKey(),
    id_utente: integer('id_utente').notNull(),
    token: text('token').notNull(),
    data_scadenza: timestamp('data_scadenza'),
}, (table) => [
    index('fk_not_valid_tokens_utenti').on(table.id_utente),
]);

export const token_sungrow = pgTable('token_sungrow', {
    id: integer('id').primaryKey().default(sql`nextval('token_sungrow_id_seq'::regclass)`),
    access_token: varchar('access_token').notNull(),
    refresh_token: varchar('refresh_token').notNull(),
});

export const utenti = pgTable('utenti', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
});
