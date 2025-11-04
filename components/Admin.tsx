import React, { useState } from 'react';
import AdminDashboard from './admin/AdminDashboard.js';
import UserManagementPanel from './admin/UserManagementPanel.js';
import MailSystemPanel from './admin/MailSystemPanel.js';
import ServerSettingsPanel from './admin/ServerSettingsPanel.js';
import { useAppContext } from '../hooks/useAppContext.js';

type AdminView = 'dashboard' | 'userManagement' | 'mailSystem' | 'serverSettings';

const Admin: React.FC = () => {
    const [adminView, setAdminView] = useState<AdminView>('dashboard');
    const { currentUserWithStatus, allUsers, liveGames, adminLogs, gameModeAvailability, announcements, globalOverrideAnnouncement, announcementInterval, handlers } = useAppContext();

    const handleBack = () => {
        if (adminView === 'dashboard') {
            window.location.hash = '#/profile';
        } else {
            setAdminView('dashboard');
        }
    };

    const adminProps = {
        currentUser: currentUserWithStatus!,
        allUsers,
        liveGames: Object.values(liveGames),
        adminLogs,
        onAction: handlers.handleAction,
        onBack: handleBack,
        gameModeAvailability,
        announcements,
        globalOverrideAnnouncement,
        announcementInterval,
    };

    const renderView = () => {
        switch (adminView) {
            case 'userManagement':
                return <UserManagementPanel {...adminProps} />;
            case 'mailSystem':
                return <MailSystemPanel {...adminProps} />;
            case 'serverSettings':
                return <ServerSettingsPanel {...adminProps} />;
            case 'dashboard':
            default:
                return <AdminDashboard onNavigate={setAdminView} onBackToProfile={handleBack} {...adminProps} />;
        }
    };

    return (
        <div className="p-4 lg:p-8">
            {renderView()}
        </div>
    );
};

export default Admin;