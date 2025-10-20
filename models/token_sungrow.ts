import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface token_sungrowAttributes {
  id: number;
  access_token: string;
  refresh_token: string;
}

export type token_sungrowPk = "id";
export type token_sungrowId = token_sungrow[token_sungrowPk];
export type token_sungrowOptionalAttributes = "id";
export type token_sungrowCreationAttributes = Optional<token_sungrowAttributes, token_sungrowOptionalAttributes>;

export class token_sungrow extends Model<token_sungrowAttributes, token_sungrowCreationAttributes> implements token_sungrowAttributes {
  id!: number;
  access_token!: string;
  refresh_token!: string;


  static initModel(sequelize: Sequelize.Sequelize): typeof token_sungrow {
    return token_sungrow.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    access_token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    refresh_token: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'token_sungrow',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "token_sungrow_pk",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
