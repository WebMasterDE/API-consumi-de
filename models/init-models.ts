import type { Sequelize } from "sequelize";
import { not_valid_tokens as _not_valid_tokens } from "./not_valid_tokens";
import type { not_valid_tokensAttributes, not_valid_tokensCreationAttributes } from "./not_valid_tokens";
import { utenti as _utenti } from "./utenti";
import type { utentiAttributes, utentiCreationAttributes } from "./utenti";

export {
  _not_valid_tokens as not_valid_tokens,
  _utenti as utenti,
};

export type {
  not_valid_tokensAttributes,
  not_valid_tokensCreationAttributes,
  utentiAttributes,
  utentiCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  const not_valid_tokens = _not_valid_tokens.initModel(sequelize);
  const utenti = _utenti.initModel(sequelize);


  return {
    not_valid_tokens: not_valid_tokens,
    utenti: utenti,
  };
}
