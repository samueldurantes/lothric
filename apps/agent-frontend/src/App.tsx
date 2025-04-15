import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { FileUploadZone } from './components/FileUploadZone';
import { FileList } from './components/FileList';
import { useTorus } from './hooks/useTorus';
import { useAuth } from './hooks/useAuth';
import { UserBar } from './components/UserBar';
import { useGetGetFiles, usePostPinFile } from './schema/default/default';

function IsLoading() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="text-gray-500">Loading...</div>
      </div>
    </div>
  );
}

function Login() {
  const { getWallets, isLoading: isLoadingTorus } = useTorus();
  const { authenticateUser, isLoading: isAuthenticating } = useAuth();
  const [wallets, setWallets] = useState<InjectedAccountWithMeta[] | undefined>(
    undefined
  );

  const isLoading = isLoadingTorus || isAuthenticating;

  useEffect(() => {
    if (wallets) {
      return;
    }

    if (!getWallets) {
      return;
    }

    void getWallets().then(setWallets);
  }, [getWallets, wallets]);

  if (isLoading) {
    return <IsLoading />;
  }

  return (
    <div className="h-screen flex items-center justify-center">
      {wallets?.length ? (
        <div className="flex flex-col items-center gap-2">
          {wallets.map((wallet, key) => (
            <div className="border border-gray-200 rounded-lg p-2" key={key}>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                <div>{wallet.address}</div>
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded-md"
                  onClick={() => authenticateUser(wallet)}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>No wallets found (maybe you need to install the SubWallet)</div>
      )}
    </div>
  );
}

function App() {
  const { user, isAuthenticated, isLoading, token } = useAuth();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: filesResponse, isLoading: isLoadingFiles } = useGetGetFiles({
    query: {
      queryKey: ['get-files'],
    },
    request: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { mutate: pinFile } = usePostPinFile({
    request: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = (fileList: FileList) => {
    enqueueSnackbar('Uploading files...', {
      variant: 'info',
    });

    Array.from(fileList).forEach((file) => {
      pinFile(
        { data: { file } },
        {
          onSuccess: (response) => {
            if (response.status === 200) {
              queryClient.setQueryData(['get-files'], (oldData: any) => {
                if (!oldData) {
                  return;
                }

                return {
                  ...oldData,
                  data: {
                    ...oldData.data,
                    files: [
                      ...oldData.data.files,
                      {
                        name: file.name,
                        size: file.size,
                        cid: response.data.file.cid,
                      },
                    ],
                  },
                };
              });
            }
          },
        }
      );
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  if (isLoading || isLoadingFiles) {
    return <IsLoading />;
  }

  const files =
    filesResponse?.status === 200
      ? filesResponse.data.files.map((file) => ({
          name: file.name,
          size: file.size,
          cid: file.cid,
          status: 'complete' as const,
        }))
      : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <UserBar user={user} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Upload Files
          </h1>
          <p className="text-gray-600">
            Drag and drop your files here or click to browse
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />

        <FileUploadZone
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        />

        {files.length > 0 && <FileList files={files} />}
      </div>
    </div>
  );
}

export default App;
