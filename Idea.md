# Dead Man’s Switch Web Application

## 1. Overview

The Dead Man’s Switch Web Application is a secure, verification-based system designed to automatically release predefined information or perform specific actions **only after a user is confirmed to be deceased or permanently incapacitated**.

## Unlike traditional dead man’s switch systems that trigger automatically after a missed check-in, this application introduces a **human verification layer** to prevent accidental or premature activation. The switch is triggered only after **trusted verifiers confirm the user’s status**, ensuring accuracy, accountability, and ethical use.

## 2. Core Objectives

- Prevent false triggers caused by travel, illness, or technical issues
- Provide users with peace of mind that sensitive data will only be released when truly necessary
- Establish a transparent, auditable verification process
- Balance automation with human judgment

---

## 3. Key Roles

### 3.1 User (Owner of the Switch)

The individual who creates and manages a dead man’s switch. The user:

- Defines check-in intervals
- Selects trusted verifiers
- Specifies what action should occur upon verification
- Can cancel or reset the switch at any time while alive

### 3.2 Verifier

A trusted third party chosen by the user (e.g., family member, lawyer, close friend). A verifier:

- Is notified when the user becomes unresponsive
- Confirms or denies the user’s death/incapacitation
- Cannot modify messages or trigger actions directly

### 3.3 System

The automated backend responsible for:

- Monitoring check-ins
- Managing verification workflows
- Enforcing security, delays, and audit logs
- Executing actions only after verification rules are satisfied

---

## 4. Functional Description

### 4.1 Switch Creation and Configuration

The user creates a dead man’s switch by:

- Selecting a **check-in interval** (e.g., every 7, 14, or 30 days)
- Defining a **grace period** after a missed check-in
- Adding one or more **verifiers**
- Choosing a **verification threshold** (e.g., 2 out of 3 verifiers must confirm)
- Writing a message or defining an action to be executed upon verification

All configurations are editable while the switch is active and not in verification mode.

---

### 4.2 Check-In Mechanism

- The system sends periodic reminders to the user before each check-in deadline.
- The user confirms their status via a simple “I’m alive” action.
- Each successful check-in resets the countdown timer.
- Failure to check in does **not** immediately trigger the switch.

---

### 4.3 Missed Check-In and Grace Period

When a check-in is missed:

- The switch enters an **Overdue** state.
- The user receives multiple reminder notifications during the grace period.
- If the user checks in during this period, the switch returns to normal operation.

---

### 4.4 Verification Phase

If the grace period expires without user response:

- The switch enters **Verification Mode**
- Selected verifiers are notified via secure email links
- Each verifier is asked to confirm one of the following:
  - The user is deceased or permanently incapacitated
  - The user is alive or the alert is incorrect

Each verification action is:

- Authenticated
- Time-limited
- Logged with timestamp and IP address

---

### 4.5 Verification Decision Logic

- The switch requires a predefined **quorum** of confirmations to proceed.
- A single “user is alive” response immediately cancels verification and resets the switch.
- If the required number of confirmations is reached, the switch is marked as **Verified**.
- If the verification window expires without quorum, the switch remains inactive until manual or user intervention.

---

### 4.6 Final Delay and Execution

After successful verification:

- A final safety delay (e.g., 24 hours) is enforced
- If the user checks in during this window, execution is canceled
- After the delay, the system executes the predefined action

Possible actions include:

- Sending emails to recipients
- Releasing stored messages
- Triggering webhooks or APIs
- Publishing predefined content

---

## 5. State Machine (Lifecycle)

1. **Active**
2. **Overdue**
3. **Grace Period**
4. **Pending Verification**
5. **Verified**
6. **Executed**
7. **Canceled / Reset**

Transitions between states are fully logged and auditable.

---

## 6. Security and Privacy

- All sensitive data is encrypted at rest and in transit
- Verification links are single-use and time-limited
- Messages are only decrypted at execution time
- No verifier can view message content
- Immutable audit logs record all critical actions

---

## 7. Anti-Abuse and Safety Measures

- Verification cannot begin immediately after a missed check-in
- Users are notified when verification begins
- Multiple verifiers reduce malicious or mistaken confirmations
- Execution delays allow last-minute recovery
- Clear legal disclaimers are shown to users and verifiers

---

## 8. Legal and Ethical Considerations

- Verifiers must explicitly acknowledge the seriousness of their action
- The platform does not determine death; it only records human confirmation
- Users are responsible for the content and consequences of triggered actions
- The service does not guarantee delivery or legal validity of messages

---

## 9. Limitations

- The system relies on verifier honesty and availability
- It does not replace legal wills, death certificates, or authorities
- Network or email failures may delay notifications

---

## 10. Intended Use Cases

- Digital inheritance and legacy messages
- Emergency notification systems
- Activism and whistleblowing (non-immediate release)
- Personal contingency planning

---

## 11. Summary

This dead man’s switch web application prioritizes **accuracy over automation** by combining scheduled check-ins with human verification. By requiring trusted individuals to confirm a user’s status before any action is taken, the system minimizes false triggers, protects sensitive information, and provides a responsible, ethical approach to automated posthumous actions.

---
