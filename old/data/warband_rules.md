# Mordheim Warband Verification Checklist

Use this guide to verify if your warband is legal based on the "Macki Drachenfels" rules (Page 19).

## General Composition Rules
- [ ] **Budget**: Total cost must not exceed **500 gc** for a starting warband.
- [ ] **Minimum Heroes**: Must have at least **1 Hero**.
- [ ] **Maximum Heroes**: Cannot exceed **6 Heroes** in total.
- [ ] **Leader**: Must have exactly **1 Leader** (Lider).
- [ ] **Wizard**: Cannot have more than **1 Wizard** (Czarodziej).
- [ ] **Special**: Cannot have more than **1 Special** model.
- [ ] **Animal Slot**: 
    - You may replace **ONE** hero slot with **ONE** type of animal.
    - Example: 5 Heroes + 1 Animal group (e.g. 3 Dogs) = 6 slots used.
    - You cannot have two different types of animals (e.g. both a Bear and Dogs).

## Fighter Specifics
- [ ] **Equipment**: Heroes can use any items from the list unless excluded (e.g. Wizards/Slayers/Sisters).
- [ ] **Free Dagger**: Every model (except Animals/Ogres) gets **1 free dagger** (Sztylet) at recruitment.
- [ ] **Animals**: Cannot buy or carry equipment, don't gain experience.
- [ ] **Large Models (Ogres/Trolls)**: Count as **20 points** + experience for the Warband Rating (standard models are 5 pts).

## Warband Specific Limits

### Awanturnicy
- [ ] **Kapitan / Łowca / Szlachcic**: Max 1 leader total (you pick which one).
- [ ] **Najemnik / Młodzik**: Max 2 of each.
- [ ] **Biczownik**: Max 1.
- [ ] **Siostra Sigmara**: Max 1.
- [ ] **Krasnoludzki Pogromca**: Max 2.
- [ ] **Animals**: Choose either 0-1 Bear OR 0-3 Dogs.

### Słudzy Ciemności
- [ ] **Wampir / Zabójca / Szef / Czempion**: Max 1 leader total.
- [ ] **Sługus / Czarnoszczur / Posłaniec / Mutant**: Max 2 of each.
- [ ] **Mroczna Dusza / Zwierzoczłek**: Max 2 of each.
- [ ] **Mutations**: Mutants and Possessed must buy at least one at start. Price doubles for each subsequent mutation on the same model.
- [ ] **Animals**: One type only (e.g. 0-4 Rats OR 0-1 Troll).

## Verification Logic (for Developers)
1. `count(Heros) + (count(Zwierze) > 0 ? 1 : 0) <= 6`
2. `count(Lider) == 1`
3. `count(Czarodziej) <= 1`
4. `count(Specjalne) <= 1`
5. `unique_types(Zwierze) <= 1`
