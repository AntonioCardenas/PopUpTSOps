"use client";

import { X } from "lucide-react";

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

export default function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel"
}: ConfirmationDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-96 px-8 py-4 bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] grid place-content-center">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-base hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <p className="text-base mb-6 text-gray-700">{message}</p>

                    <div className="flex space-x-2 mx-auto w-32">
                        <button
                            onClick={onClose}
                            className="text-base hover:text-gray-600"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="h-12 border-black border-2 p-2.5 bg-[#A4FCF6] hover:bg-[#81a8f8] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#D0C4fB] rounded-full font-medium"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 