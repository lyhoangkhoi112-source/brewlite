'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiUrl, readErrorMessage } from '../api-helpers';

interface ChangePasswordDialogProps {
  accessToken: string;
  onClose: () => void;
}

export function ChangePasswordDialog({
  accessToken,
  onClose,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới nhập lại không khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/login/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể đổi mật khẩu.'));
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Đổi mật khẩu thành công.');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-heading"
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
              Bảo mật tài khoản
            </p>
            <h2
              id="change-password-heading"
              className="mt-2 text-xl font-semibold"
            >
              Đổi mật khẩu
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-[#dce2da] px-3 text-sm font-medium text-[#405d47]"
          >
            Đóng
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 rounded-xl bg-[#edf2e9] px-4 py-3 text-sm text-[#405d47]">
            {notice}
          </p>
        )}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-[#46544a]">
            Mật khẩu hiện tại
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] px-3 py-2 text-[#26382d]"
            />
          </label>
          <label className="block text-sm font-medium text-[#46544a]">
            Mật khẩu mới
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] px-3 py-2 text-[#26382d]"
            />
            <span className="mt-1 block text-xs text-[#69746b]">
              Tối thiểu 8 ký tự.
            </span>
          </label>
          <label className="block text-sm font-medium text-[#46544a]">
            Nhập lại mật khẩu mới
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] px-3 py-2 text-[#26382d]"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl bg-[#304b39] px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </section>
    </div>
  );
}
