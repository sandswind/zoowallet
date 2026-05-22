import React, { useState } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";

interface PasswordModalProps {
  open: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  open,
  title = "输入密码",
  description,
  loading = false,
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    onSubmit(password);
    setPassword("");
  };

  const handleCancel = () => {
    setPassword("");
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleCancel} title={title}>
      {description && (
        <p className="text-sm text-muted mb-4">{description}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          type="password"
          placeholder="请输入钱包密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleCancel}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!password}
          >
            确认
          </Button>
        </div>
      </form>
    </Modal>
  );
};
