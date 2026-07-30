import { DEFAULT_EGG_RACK_SIZE } from "../constants/app";

export type EggStockBreakdown = {
  racks: number;
  pieces: number;
  totalPieces: number;
};

function validateRackSize(rackSize: number): void {
  if (!Number.isInteger(rackSize) || rackSize <= 0) {
    throw new RangeError(
      "Jumlah butir per rak harus berupa bilangan bulat positif.",
    );
  }
}

function validateNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `${label} harus berupa bilangan bulat nol atau lebih.`,
    );
  }
}

export function convertEggStockToPieces(
  racks: number,
  pieces: number,
  rackSize: number = DEFAULT_EGG_RACK_SIZE,
): number {
  validateRackSize(rackSize);
  validateNonNegativeInteger(racks, "Jumlah rak");
  validateNonNegativeInteger(pieces, "Jumlah butir");

  return racks * rackSize + pieces;
}

export function convertPiecesToEggStock(
  totalPieces: number,
  rackSize: number = DEFAULT_EGG_RACK_SIZE,
): EggStockBreakdown {
  validateRackSize(rackSize);
  validateNonNegativeInteger(totalPieces, "Total stok telur");

  const racks = Math.floor(totalPieces / rackSize);
  const pieces = totalPieces % rackSize;

  return {
    racks,
    pieces,
    totalPieces,
  };
}

export function formatEggStock(
  totalPieces: number,
  rackSize: number = DEFAULT_EGG_RACK_SIZE,
): string {
  const { racks, pieces } = convertPiecesToEggStock(totalPieces, rackSize);

  if (racks === 0) {
    return `${pieces} butir`;
  }

  if (pieces === 0) {
    return `${racks} rak`;
  }

  return `${racks} rak + ${pieces} butir`;
}
