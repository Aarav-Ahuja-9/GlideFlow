'use client';
import { X, Send } from 'lucide-react';
import styles from './modal.module.css'; // Corrected CSS Module import

export default function ComposeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>New Message</h3>
          <X size={20} onClick={onClose} style={{ cursor: 'pointer' }} />
        </div>
        <div className={styles.body}>
          <input placeholder="To" className={styles.input} />
          <input placeholder="Subject" className={styles.input} />
          <textarea placeholder="Write your email..." className={styles.textarea} />
        </div>
        <div className={styles.footer}>
          <button className={styles.sendBtn}>
            <Send size={16} /> Send Email
          </button>
        </div>
      </div>
    </div>
  );
}