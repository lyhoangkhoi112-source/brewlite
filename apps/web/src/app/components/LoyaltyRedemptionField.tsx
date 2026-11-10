'use client';

interface LoyaltyRedemptionFieldProps {
  balance: number | null;
  loading: boolean;
  subtotal: number;
  points: number;
  onPointsChange: (points: number) => void;
}

export function LoyaltyRedemptionField({
  balance,
  loading,
  subtotal,
  points,
  onPointsChange,
}: LoyaltyRedemptionFieldProps) {
  const maxPoints =
    balance === null
      ? 0
      : Math.min(balance, Math.floor((subtotal * 0.2) / 3_000));
  const selectedPoints = Math.min(points, maxPoints);

  return (
    <section className="mt-4 rounded-xl bg-[#f4f7f2] p-4">
      <p className="text-sm font-semibold text-[#304b39]">Đổi điểm thành viên</p>
      {loading ? (
        <p className="mt-2 text-sm text-[#69746b]">Đang tải số dư điểm...</p>
      ) : balance === null ? (
        <p className="mt-2 text-sm text-red-700">
          Không tải được số dư điểm. Vui lòng mở lịch sử đơn hàng để thử lại.
        </p>
      ) : balance === 0 ? (
        <p className="mt-2 text-sm text-[#69746b]">
          Bạn chưa có điểm để sử dụng.
        </p>
      ) : maxPoints === 0 ? (
        <p className="mt-2 text-sm text-[#69746b]">
          Đơn hàng chưa đủ giá trị để đổi điểm. Mỗi điểm giảm 3.000đ, tối đa
          20% giá trị đơn.
        </p>
      ) : (
        <>
          <label className="mt-2 block text-sm text-[#46544a]">
            Số điểm muốn dùng (tối đa {maxPoints})
            <input
              type="number"
              min={0}
              max={maxPoints}
              step={1}
              value={selectedPoints}
              onChange={(event) => {
                const nextPoints = Number.parseInt(event.target.value, 10);
                onPointsChange(
                  Number.isFinite(nextPoints)
                    ? Math.max(0, Math.min(nextPoints, maxPoints))
                    : 0,
                );
              }}
              className="mt-1 min-h-11 w-full rounded-xl border border-[#dce2da] bg-white px-3 py-2 text-[#26382d]"
            />
          </label>
          <p className="mt-2 text-xs text-[#69746b]">
            Số dư: {balance.toLocaleString('vi-VN')} điểm · Giảm{' '}
            {(selectedPoints * 3_000).toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-1 text-xs text-[#69746b]">
            Thanh toán sau đổi điểm:{' '}
            {Math.max(0, subtotal - selectedPoints * 3_000).toLocaleString(
              'vi-VN',
            )}{' '}
            đ
          </p>
        </>
      )}
    </section>
  );
}
