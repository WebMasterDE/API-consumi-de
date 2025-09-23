import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface not_valid_tokensAttributes {
  id: number;
  id_utente: number;
  token: string;
  data_scadenza?: Date;
}

export type not_valid_tokensPk = "id";
export type not_valid_tokensId = not_valid_tokens[not_valid_tokensPk];
export type not_valid_tokensOptionalAttributes = "id" | "data_scadenza";
export type not_valid_tokensCreationAttributes = Optional<not_valid_tokensAttributes, not_valid_tokensOptionalAttributes>;

export class not_valid_tokens extends Model<not_valid_tokensAttributes, not_valid_tokensCreationAttributes> implements not_valid_tokensAttributes {
  id!: number;
  id_utente!: number;
  token!: string;
  data_scadenza?: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof not_valid_tokens {
    return not_valid_tokens.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    id_utente: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    data_scadenza: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'not_valid_tokens',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "fk_not_valid_tokens_utenti",
        using: "BTREE",
        fields: [
          { name: "id_utente" },
        ]
      },
    ]
  });
  }
}
