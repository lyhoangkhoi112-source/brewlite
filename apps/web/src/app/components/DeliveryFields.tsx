'use client';

interface DeliveryFieldsProps {
  phone: string;
  address: string;
  validationAttempted: boolean;
  error: string | null;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onClearError: () => void;
}

export function DeliveryFields({
  phone,
  address,
  validationAttempted,
  error,
  onPhoneChange,
  onAddressChange,
  onClearError,
}: DeliveryFieldsProps) {
  const phoneError =
    validationAttempted && !phone.trim()
      ? 'Vui lòng nhập số điện thoại liên hệ.'
      : null;
  const addressError =
    validationAttempted && !address.trim()
      ? 'Vui lòng nhập địa chỉ giao hàng, bao gồm số nhà.'
      : validationAttempted && !/\d/.test(address)
        ? 'Vui lòng nhập số nhà trong địa chỉ giao hàng.'
        : null;

  return (
    <section className="rounded-2xl border border-[#e8e1d3] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-[#304b39]">
        Thông tin giao hàng
      </h2>
      <p className="mt-1 text-sm text-[#69746b]">
        Không cần đăng nhập. Chúng tôi dùng thông tin này để giao và liên hệ với
        bạn.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-[#46544a]">
          Số điện thoại liên hệ
          <input
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => {
              onPhoneChange(event.target.value);
              onClearError();
            }}
            placeholder="Ví dụ: 0901234567"
            className="mt-2 w-full rounded-xl border border-[#dce2da] px-3.5 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
          />
          {phoneError && (
            <span className="mt-1 block text-xs text-red-700" role="alert">
              {phoneError}
            </span>
          )}
        </label>
        <label className="text-sm font-medium text-[#46544a]">
          Địa chỉ giao hàng
          <input
            type="text"
            autoComplete="street-address"
            required
            value={address}
            onChange={(event) => {
              onAddressChange(event.target.value);
              onClearError();
            }}
            placeholder="Số nhà, đường, phường/xã, quận/huyện"
            className="mt-2 w-full rounded-xl border border-[#dce2da] px-3.5 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
          />
          {addressError && (
            <span className="mt-1 block text-xs text-red-700" role="alert">
              {addressError}
            </span>
          )}
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </section>
  );
}
