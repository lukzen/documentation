# Transfer Booking Flow — Current vs Proposed

## Current Flow

```mermaid
---
title: Current Flow — Hotel + Transfer Booked Together
---
sequenceDiagram
    participant User
    participant BookingPage
    participant HotelVendor
    participant ConfirmPage
    participant Mozio

    User->>BookingPage: Fill guest details
    User->>BookingPage: Select transfer vehicle
    User->>BookingPage: Enter payment + flight info
    User->>BookingPage: Click Confirm Booking

    BookingPage->>HotelVendor: Book hotel
    HotelVendor-->>BookingPage: Hotel confirmed

    alt Transfer selected
        BookingPage->>Mozio: Book transfer
        alt Success
            Mozio-->>BookingPage: Transfer confirmed
            BookingPage->>ConfirmPage: You are all set!
        else Failure
            Mozio-->>BookingPage: Transfer failed
            BookingPage->>ConfirmPage: Hotel Booked but Transfer Needs Attention
            Note over ConfirmPage: User confused - mixed status
        end
    else No transfer
        BookingPage->>ConfirmPage: You are all set!
    end
```

## Proposed Flow

```mermaid
---
title: Proposed Flow — Hotel First, Transfer After Confirmation
---
sequenceDiagram
    participant User
    participant BookingPage
    participant HotelVendor
    participant ConfirmPage
    participant DetailsPage
    participant Mozio

    User->>BookingPage: Fill guest details
    User->>BookingPage: Enter payment
    User->>BookingPage: Click Confirm Booking

    BookingPage->>HotelVendor: Book hotel only
    HotelVendor-->>BookingPage: Hotel confirmed
    BookingPage->>ConfirmPage: You are all set!

    Note over ConfirmPage: Clean confirmation - no transfer noise

    alt User wants transfer
        User->>ConfirmPage: Click Add Airport Transfer
        ConfirmPage->>DetailsPage: Redirect to booking details
        User->>DetailsPage: Search vehicles
        User->>DetailsPage: Select vehicle + flight info
        DetailsPage->>Mozio: Book transfer
        alt Success
            Mozio-->>DetailsPage: Transfer confirmed
            Note over DetailsPage: Shows transfer card with confirmation number
        else Failure
            Mozio-->>DetailsPage: Transfer failed
            Note over DetailsPage: Shows error + Retry button. Hotel unaffected.
        end
    end
```

## Key Differences

| Aspect | Current | Proposed |
|---|---|---|
| Hotel + Transfer | Booked together | Hotel first, transfer after |
| Partial failure | Confusing mixed status | Clean separation |
| Flight info | Required before hotel booking | Only when adding transfer |
| Confirmation page | 3 possible states | Always clean |
| Transfer management | Built but underused | Primary flow |
| Complexity | High (2 vendors in 1 flow) | Low (1 vendor per step) |
