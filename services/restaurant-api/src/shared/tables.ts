export interface SeatRecord {
  id: string;
  seatNumber: number;
  label: string;
  guestId?: string;
  guestName?: string;
  isOccupied: boolean;
}

export function generateSeats(capacity: number, tableId: number): SeatRecord[] {
  const seats: SeatRecord[] = [];
  for (let i = 1; i <= capacity; i++) {
    seats.push({
      id: `seat_${tableId}_${i}`,
      seatNumber: i,
      label: `S${i}`,
      isOccupied: false,
    });
  }
  return seats;
}
