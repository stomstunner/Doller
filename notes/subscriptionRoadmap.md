subscription.controller.js

1. toggleSubscription              -> Channel subscribe/unsubscribe (video) & follow/unfollow (tweet)
2. toggleSubscriptionNotification  -> Subscribed channel ki bell notifications ON/OFF karna
3. getUserChannelSubscribers       -> Channel ke saare active subscribers/followers ki list
4. getSubscribedChannels           -> User ne jin channels ko subscribe/follow kiya hai unki list
5. getSubscriptionFeed             -> Subscribed channels ki latest videos ya tweets fetch karna
---

# toggleSubscription

              USER
                ↓
    toggle subscription request
                ↓
        ┌─────────────────┐
        │  Validate ID    │
        └────────┬────────┘
                 ↓
        Khud ka channel hai?
                 │
          ┌──────┴──────┐
          │             │
         YES            NO
          │             │
          ▼             ▼
     Error (400)   Channel exist karta hai?
                        │
                 ┌──────┴──────┐
                 │             │
                NO            YES
                 │             │
                 ▼             ▼
            Error (404)   DB me record hai?
                                 │
                          ┌──────┴──────┐
                          │             │
                         YES            NO
                          │             │
                          ▼             ▼
                   isActive flip   Naya record create
                   (!isActive)     (isActive: true)
                          │             │
                          └──────┬──────┘
                                 ↓
                      Updated count nikalo
                                 ↓
                             Response