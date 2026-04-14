#!/bin/bash
# Send a test push notification to the booted iOS simulator.
# Usage:
#   ./push.sh group    — send a group message notification
#   ./push.sh friend   — send a friend request notification

BUNDLE_ID="co.naveapp.app"
DIR="$(cd "$(dirname "$0")" && pwd)"

case "$1" in
  group)
    xcrun simctl push booted "$BUNDLE_ID" "$DIR/group-message.apns"
    echo "Sent group message notification"
    ;;
  friend)
    xcrun simctl push booted "$BUNDLE_ID" "$DIR/friend-request.apns"
    echo "Sent friend request notification"
    ;;
  *)
    echo "Usage: $0 [group|friend]"
    exit 1
    ;;
esac
