'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2, FileImage, Check } from 'lucide-react';
import { transactionApi, getErrorMessage } from '@/lib/api';
import { Transaction } from '@/types';
import { toast } from '@/components/ui/Toaster';

interface Props { transaction: Transaction; onClose: () => void; }

export default function ReceiptModal({ transaction, onClose }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const mutation = useMutation({
    mutationFn: () => transactionApi.uploadReceipt(transaction.id, file!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Receipt uploaded', description: data.extracted?.amount ? `Detected amount: $${data.extracted.amount}` : undefined });
      onClose();
    },
    onError: (err) => toast({ title: 'Upload failed', description: getErrorMessage(err), variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Receipt</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">For: <span className="font-medium text-gray-900 dark:text-white">{transaction.description}</span></p>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-600 hover:border-primary-400'}`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img src={preview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="space-y-2">
                <FileImage size={40} className="mx-auto text-gray-300" />
                <p className="text-sm text-gray-500">{isDragActive ? 'Drop here' : 'Drag & drop or click to select'}</p>
                <p className="text-xs text-gray-400">JPG, PNG, WEBP up to 10MB</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <Check size={16} className="text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">{file.name} selected</span>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!file || mutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {mutation.isPending ? 'Scanning...' : 'Upload & Scan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
