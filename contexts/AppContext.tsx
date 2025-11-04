import React, { createContext, ReactNode } from 'react';
import { useApp } from '../hooks/useApp.js';

// Infer the type of the context from the hook's return value
type AppContextType = ReturnType<typeof useApp>;

// Create the context with a default undefined value
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Create the provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const appData = useApp();
    return (
        <AppContext.Provider value={appData}>
            {children}
        </AppContext.Provider>
    );
};
