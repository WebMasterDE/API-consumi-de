import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { tipo_dato, tipo_datoId } from './tipo_dato';

export interface letture_inverterAttributes {
  id: number;
  id_dato: number;
  valore?: number;
  data_lettura: Date;
}

export type letture_inverterPk = "id";
export type letture_inverterId = letture_inverter[letture_inverterPk];
export type letture_inverterOptionalAttributes = "id" | "valore";
export type letture_inverterCreationAttributes = Optional<letture_inverterAttributes, letture_inverterOptionalAttributes>;

export class letture_inverter extends Model<letture_inverterAttributes, letture_inverterCreationAttributes> implements letture_inverterAttributes {
  id!: number;
  id_dato!: number;
  valore?: number;
  data_lettura!: Date;

  // letture_inverter belongsTo tipo_dato via id_dato
  id_dato_tipo_dato!: tipo_dato;
  getId_dato_tipo_dato!: Sequelize.BelongsToGetAssociationMixin<tipo_dato>;
  setId_dato_tipo_dato!: Sequelize.BelongsToSetAssociationMixin<tipo_dato, tipo_datoId>;
  createId_dato_tipo_dato!: Sequelize.BelongsToCreateAssociationMixin<tipo_dato>;

  static initModel(sequelize: Sequelize.Sequelize): typeof letture_inverter {
    return letture_inverter.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    id_dato: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tipo_dato',
        key: 'id'
      }
    },
    valore: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    data_lettura: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'letture_inverter',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "letture_inverter_pk",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
