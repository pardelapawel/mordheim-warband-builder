# Drachenfels rules corrections

Checklist for reconciling the roster with the supplied Drachenfels markdown and PDF. Completed entries are crossed out after implementation and verification. Existing player-entered campaign progress is preserved.

- [x] ~~1. Separate starting rules from learnable special skills; preserve existing saved skills.~~
- [x] ~~2. Enforce racial and character eligibility for special and general skills.~~
- [x] ~~3. Correct Ogre weapon prices, normal melee access, size restrictions, and miscellaneous-equipment restrictions.~~
- [x] ~~4. Correct the dwarf leader's five-heroes-plus-animal allowance.~~
- [x] ~~5. Add equipment eligibility for dwarf axes, squig prods, blessed hammers, and prayer books.~~
- [x] ~~6. Add the dwarf noble's missing hatred and correct the Giant Rat's race.~~
- [x] ~~7. Restore full bear, Rat Ogre, Vampire, and other special-rule conditions.~~
- [x] ~~8. Restore complete spell effects and display casting difficulties.~~
- [x] ~~9. Restore consumable restrictions, side effects, and duration descriptions.~~
- [x] ~~10. Check weapon carrying limits and incompatible weapon-use warnings.~~
- [x] ~~11. Respect Battle Mage armour permission and other skill-specific restrictions.~~
- [x] ~~12. Support recruitment and campaign purchase prices without repricing existing purchases.~~
- [x] ~~13. Add gromril and ithilmar weapon variants with correct price multipliers.~~
- [x] ~~14. Add the optional recruitment advances, including costs, experience, and profile changes.~~
- [x] ~~15. Add the six magical artefacts from page 43 as found items.~~
- [x] ~~16. Preserve and normalize old saves; document corrections that cannot safely be inferred.~~
- [x] ~~17. Resolve the Dmuchawka price conflict: use 20 gc, as chosen by the user.~~
- [x] ~~18. Run rule regressions and desktop/mobile browser checks; refresh deployment output.~~
- [x] ~~19. Review remaining problems and prepare the verified corrections for GitHub.~~

Sources: `../extracted_markdown/page_10.md` through `page_36.md`, `page_43.md`, and the original PDF for ambiguous column layouts. The existing 47 fighter profiles, costs, limits, experience values, and general skill-category tables already agree with the source.

## PDF audit (version 23.09.26)

- [x] ~~Mroczny jad: +1 S does not apply to armour modification.~~
- [x] ~~Lecząca Dłoń heals only friendly models; Przyzwanie gryzoni gives -2 armour (target need not be visible); magic missiles use the "Magiczny pocisk" wording.~~
- [x] ~~Fear immunity only for Ogr Najemnik, Tresowany Niedźwiedź and Wampirs; Wulfen, Szczuroogr, Minotaur, Troll, Ghoul and Opętany only cause fear.~~
- [x] ~~Added Słudzy Cienia (enforced Wilkor/Ghoul 0-3 with Nekromanta and Wampir), Motywator and ŁAAA!!! (Szaman).~~
- [x] ~~Ogres: added Pancerpiącha; removed ogre shield and buckler; dagger ban covers gromril/ithilmar daggers; +5 gc ogre version of every two-handed weapon; Działko pokładowe has the single PDF profile.~~
- [x] ~~Migration revision 4 updates old saves once; earlier fixes no longer re-run on every load.~~
- Dmuchawka remains 20 gc; the PDF still lists 25 gc on p30.
- "Znak Sigmar" keeps its saved name (the PDF misspells it "Znak Sigmatra").

## Decisions and limitations

- Existing saved special skills are retained because the app cannot determine whether a player earned them during a campaign. Correct starting rules apply to newly recruited fighters.
- Dmuchawka uses 20 gc from the page 20 equipment table, as explicitly chosen by the user; the page 30 discrepancy is recorded rather than silently ignored.
- Found artefacts have no listed purchase price. They are added through a separate found-item control with 0 gc spent; this is not an invented market value.
- Existing optional recruitment advances cannot be inferred from manually edited historical profiles. Their current stats and paid costs are preserved; the new controls are for explicit recruitment purchases.

## Verification

All 41 regression tests pass, including dedicated tests for the corrections above. Browser checks pass for the full existing workflow, the previous UI fixes, and the new rule controls. Desktop, mobile, and A4 print previews were visually checked. The numeric comparison confirms all 47 fighter entries, 67 checked equipment prices, and 41 spell difficulties match the selected source values.

No unresolved source or implementation blockers remain. The user resolved the Dmuchawka discrepancy in favour of 20 gc. Historical skills and costs that cannot safely be inferred are deliberately retained, as explained above.
