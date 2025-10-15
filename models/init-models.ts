import type { Sequelize } from "sequelize";
import { dispositivi as _dispositivi } from "./dispositivi";
import type { dispositiviAttributes, dispositiviCreationAttributes } from "./dispositivi";
import { letture_inverter as _letture_inverter } from "./letture_inverter";
import type { letture_inverterAttributes, letture_inverterCreationAttributes } from "./letture_inverter";
import { not_valid_tokens as _not_valid_tokens } from "./not_valid_tokens";
import type { not_valid_tokensAttributes, not_valid_tokensCreationAttributes } from "./not_valid_tokens";
import { tipo_dato as _tipo_dato } from "./tipo_dato";
import type { tipo_datoAttributes, tipo_datoCreationAttributes } from "./tipo_dato";
import { utenti as _utenti } from "./utenti";
import type { utentiAttributes, utentiCreationAttributes } from "./utenti";

export {
  _dispositivi as dispositivi,
  _letture_inverter as letture_inverter,
  _not_valid_tokens as not_valid_tokens,
  _tipo_dato as tipo_dato,
  _utenti as utenti,
};

export type {
  dispositiviAttributes,
  dispositiviCreationAttributes,
  letture_inverterAttributes,
  letture_inverterCreationAttributes,
  not_valid_tokensAttributes,
  not_valid_tokensCreationAttributes,
  tipo_datoAttributes,
  tipo_datoCreationAttributes,
  utentiAttributes,
  utentiCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  const dispositivi = _dispositivi.initModel(sequelize);
  const letture_inverter = _letture_inverter.initModel(sequelize);
  const not_valid_tokens = _not_valid_tokens.initModel(sequelize);
  const tipo_dato = _tipo_dato.initModel(sequelize);
  const utenti = _utenti.initModel(sequelize);

  letture_inverter.belongsTo(tipo_dato, { as: "id_dato_tipo_dato", foreignKey: "id_dato"});
  tipo_dato.hasMany(letture_inverter, { as: "letture_inverters", foreignKey: "id_dato"});

  return {
    dispositivi: dispositivi,
    letture_inverter: letture_inverter,
    not_valid_tokens: not_valid_tokens,
    tipo_dato: tipo_dato,
    utenti: utenti,
  };
}
