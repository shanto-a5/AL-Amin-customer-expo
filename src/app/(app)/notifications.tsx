import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { NotificationItem, PageHeader } from '@/components/fintech-ui';
import { EmptyState, FilterTabs, Screen } from '@/components/ui';
import type { AppNotification } from '@/domain/types';
import { useFocusRefresh } from '@/modules/navigation/focus-refresh';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import { notificationService } from '@/services/notification-service';

function NotificationsScreen({ session }: { session: SessionContextValue }): React.JSX.Element {
  const refresh = useFocusRefresh();
  const [scope, setScope] = React.useState<'all' | 'unread'>('all');
  const userId = session.user?.id ?? '';
  const all = notificationService.list(userId);
  const unread = all.filter((entry) => !entry.read).length;
  const notifications = scope === 'unread' ? all.filter((entry) => !entry.read) : all;

  const markRead = (notification: AppNotification): void => {
    notificationService.markRead(userId, notification.id);
    refresh();
  };

  return (
    <Screen padded>
      <PageHeader
        backFallbackHref="/home"
        title="Notifications"
        subtitle={
          unread > 0
            ? `${unread} unread update${unread === 1 ? '' : 's'} · লেনদেন ও অ্যাকাউন্ট আপডেট`
            : 'You are all caught up · সকল আপডেট পড়া হয়েছে'
        }
        actionLabel={unread > 0 ? 'Mark all read' : undefined}
        onAction={
          unread > 0
            ? () => {
                notificationService.markAllRead(userId);
                refresh();
              }
            : undefined
        }
      />

      {all.length > 0 ? (
        <FilterTabs
          tabs={[
            { key: 'all', label: 'All', count: all.length },
            { key: 'unread', label: 'Unread', count: unread },
          ]}
          active={scope}
          onChange={(k) => setScope(k as 'all' | 'unread')}
        />
      ) : null}

      {notifications.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? 'No notifications yet' : 'Nothing unread'}
          message={
            all.length === 0
              ? 'Wallet deposits, recharges, and security alerts will appear here.'
              : 'Every notification in your inbox has been read.'
          }
          actionLabel={scope === 'unread' && all.length > 0 ? 'View all notifications' : undefined}
          onAction={scope === 'unread' && all.length > 0 ? () => setScope('all') : undefined}
        />
      ) : (
        <View style={styles.list}>
          {notifications.map((item) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onPress={() => markRead(item)}
              onMarkRead={() => markRead(item)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
});

export default withSession(NotificationsScreen, '/notifications' satisfies ProtectedRoute);
