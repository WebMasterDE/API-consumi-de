import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface utentiAttributes {
  id: number;
  username: string;
  password?: string;
}

export type utentiPk = "id";
export type utentiId = utenti[utentiPk];
export type utentiOptionalAttributes = "id" | "password";
export type utentiCreationAttributes = Optional<utentiAttributes, utentiOptionalAttributes>;

export class utenti extends Model<utentiAttributes, utentiCreationAttributes> implements utentiAttributes {
  id!: number;
  username!: string;
  password?: string;


  static initModel(sequelize: Sequelize.Sequelize): typeof utenti {
    return utenti.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'utenti',
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
    ]
  });
  }
}
