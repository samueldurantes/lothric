import { useState } from 'react';
import { User, Plus, CreditCard, History, X, LogOut } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';

import { GetCheckSession200User } from '../schema/model';
import {
  usePostConfirmPayment,
  usePostRequestQuotaIncrease,
} from '../schema/default/default';
import { useAuth } from '../hooks/useAuth';
import { useTorus } from '../hooks/useTorus';

interface UserBarProps {
  user: GetCheckSession200User | null;
}

export function UserBar({ user }: UserBarProps) {
  const [filesAmount, setFilesAmount] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const { token, isLoading: isLoadingAuth, logout } = useAuth();
  const { transferTransaction, isLoading: isLoadingTorus } = useTorus();
  const isLoading = isLoadingAuth || isLoadingTorus;

  const { mutate: confirmPayment } = usePostConfirmPayment({
    request: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    mutation: {
      onSuccess: async ({ data, status }) => {
        if (status !== 200) {
          return;
        }

        enqueueSnackbar(data.message, {
          variant: 'success',
        });
      },
    },
  });

  const { mutate: requestQuotaIncrease, error } = usePostRequestQuotaIncrease({
    request: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    mutation: {
      onSuccess: async ({ data, status }) => {
        if (status !== 200) {
          return;
        }

        await transferTransaction({
          from: user?.walletAddress,
          to: data.paymentAddress,
          amount: data.price.toString(),
          callback: ({ status, message, isFinalized, blockHash }) => {
            if (status === 'pending') {
              enqueueSnackbar(message, {
                variant: 'info',
              });
            }

            if (status === 'completed') {
              enqueueSnackbar(message, {
                variant: 'success',
              });

              if (isFinalized) {
                confirmPayment({
                  data: {
                    quoteId: data.quoteId,
                    blockHash: blockHash as string,
                  },
                });
              }
            }

            if (status === 'failed') {
              enqueueSnackbar(message, {
                variant: 'error',
              });
            }
          },
        });
      },
    },
  });

  const handleAddCredits = () => {
    setShowModal(false);

    requestQuotaIncrease({
      data: {
        additionalFiles: filesAmount,
      },
    });
  };

  if (!user || isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-200 p-2 rounded-full">
            <div className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="flex items-center space-x-4">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-32" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-gray-900">{user.walletAddress}</p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-green-600">
                <CreditCard className="w-4 h-4" />
                <span>{user.filesAvailable} files available</span>
              </div>
              <div className="flex items-center space-x-1 text-gray-500">
                <History className="w-4 h-4" />
                <span>{user.files.length} files used</span>
              </div>
              <div
                className="flex items-center space-x-1 text-red-500 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Request more files</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => {
                setShowModal(false);
                setFilesAmount(10);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Request More Files
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="credits"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select number of files
                </label>
                <div className="relative">
                  <select
                    value={filesAmount}
                    onChange={(e) => setFilesAmount(Number(e.target.value))}
                    className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white pr-10"
                  >
                    <option value={10}>10 files</option>
                    <option value={20}>20 files</option>
                    <option value={50}>50 files</option>
                    <option value={100}>100 files</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFilesAmount(10);
                  }}
                  className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCredits}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Request Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
