"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Shield, Clock, AlertTriangle } from "lucide-react";

interface VerifyClientProps {
  token: string;
  payload: {
    anon_id: string;
    batchid: string;
    iphash: string;
    useragent: string;
    iat: number;
    exp: number;
    timestamp: string;
    redirectTo: string;
  };
}

export default function VerifyClient({ token, payload }: VerifyClientProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const router = useRouter();

  const handleVerification = async () => {
    setIsVerifying(true);
    
    try {
      const response = await fetch("/api/complete-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setVerificationComplete(true);
        setTimeout(() => {
          router.push(`/study/batches/${payload.batchid}?toast=Hurray,%20You%20have%20verified%20successfully%20for%20this%20Batch.`);
        }, 2000);
      } else {
        const error = await response.json();
        router.push(`/study/batches?toast=${encodeURIComponent(error.message || "Verification failed")}`);
      }
    } catch (error) {
      console.error("Verification error:", error);
      router.push("/study/batches?toast=Verification%20failed.%20Please%20try%20again");
    } finally {
      setIsVerifying(false);
    }
  };

  const timeRemaining = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  if (verificationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Verification Complete!</h1>
          <p className="text-green-200 mb-4">
            You have successfully verified for this batch. Redirecting you to the content...
          </p>
          <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verification Required</h1>
          <p className="text-gray-300 text-sm">
            Complete verification to access your batch content
          </p>
        </div>

        {/* Time Remaining */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Time Remaining</span>
          </div>
          <div className="text-xl font-bold text-amber-300">
            {timeRemaining > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : "Expired"}
          </div>
        </div>

        {/* Verification Info */}
        <div className="space-y-4 mb-8">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-blue-300 font-medium mb-2">What happens next?</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Click the verification button below</li>
              <li>• Your access will be verified for 12 hours</li>
              <li>• You'll be redirected to your batch content</li>
            </ul>
          </div>
        </div>

        {/* Verification Button */}
        <button
          onClick={handleVerification}
          disabled={isVerifying || timeRemaining <= 0}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
            timeRemaining <= 0
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : isVerifying
              ? "bg-purple-600 text-white cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transform hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {isVerifying ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
              Verifying...
            </div>
          ) : timeRemaining <= 0 ? (
            "Verification Expired"
          ) : (
            "Complete Verification"
          )}
        </button>

        {timeRemaining <= 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Verification link has expired. Please request a new one.</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-gray-400 text-xs text-center">
            This verification is required to access premium content and prevent unauthorized access.
          </p>
        </div>
      </div>
    </div>
  );
}