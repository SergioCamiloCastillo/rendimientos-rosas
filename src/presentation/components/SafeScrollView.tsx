import React from 'react';
import { ScrollView, ScrollViewProps, RefreshControl, Platform } from 'react-native';

interface SafeScrollViewProps extends Omit<ScrollViewProps, 'refreshControl'> {
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const SafeScrollView: React.FC<SafeScrollViewProps> = ({
  children,
  refreshing = false,
  onRefresh,
  ...props
}) => {
  return (
    <ScrollView
      {...props}
      showsVerticalScrollIndicator={Platform.OS === 'ios' ? false : undefined}
      showsHorizontalScrollIndicator={Platform.OS === 'ios' ? false : undefined}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
};
