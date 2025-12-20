# Name Mismatches Report - Ratings Import

## Summary
This report lists all employee and leader names from the CSV files that don't match exactly with the database.

---

## BUDA (04066) - Employee Name Mismatches

### Missing Employees (Not Found in Database)
These employees appear in the CSV but don't exist in the database:
1. **Barbara Marley** - NOT FOUND
2. **Christian Alvarez** - NOT FOUND
3. **Elena Rodriguez** - NOT FOUND (appears 9 times in CSV)
4. **Jesse Euresti Jr** - NOT FOUND
5. **Shelby Medlin** - NOT FOUND
6. **Summer Montoya-Fowler** - NOT FOUND
7. **Marcelino Salazar** - NOT FOUND
8. **Emma Garcia** - NOT FOUND
9. **Jessica Castro** - NOT FOUND
10. **Elizabeth Scott** - Create new employee (Team Member)
11. **Monica Murillo** - Create new employee (Team Member)
12. **Alejandro Amado** - Create new employee (Team Member)
13. **Ruby Vela** - NOT FOUND

### Name Variations (CSV → Database)
These names need to be corrected in the CSV:
1. **Aurora Landa** → Should be: **Aurora Landa Mendez**
2. **Joshua Garcia** → Should be: **Josh Garcia**
3. **Giselle Laredo** → Should be: **Giselle Loredo**

---

## WEST BUDA (05508) - Employee Name Mismatches

### Missing Employees (Not Found in Database)
These employees appear in the CSV but don't exist in the database:
1. **Eli Garcia** - Should be: **Elizabeth Garcia** (Leader from Buda)
2. **Eli V** - Should be: **Elizabeth Vaszquez** (Leader from Buda)
3. **Myron Barnes** - Keep ratings recorded but with no employee id
4. **Leobardo Mendez** - Keep ratings recorded but with no employee id
5. **Jessica Estrada** - Keep ratings recorded but with no employee id
6. **David** - Should be: **David Santiago** (Employee from Buda)

### Name Variations (CSV → Database)
These names need to be corrected in the CSV:
1. **Kayden Humpherys** → Keep ratings recorded but with no employee id
2. **Cassandra Mata** → Should be: **Casandra Mata**
3. **Juliette Aguilar** → Should be: **Julette Aguilar**
4. **Brayan Castro** → Should be: **Brayan Castro Moreno**
5. **Giselle Laredo** → Should be: **Giselle Loredo**
6. **Christopher Cruz Garcia** → Should be: **Christopher Garcia**
7. **Makenzie Layne** → Should be: **Makenzi Layne**
8. **Joaquin Ibarra** → Should be: **Joseph Ibarra**
9. **Colton Stark** → Should be: **Colten Stark**
10. **Gael Nova** → Should be: **Gael Novoa**
11. **Liliam Martinez** → Should be: **Lilliam Martinez**
12. **Monica Alonso** → Should be: **Monica Alonso Feliciano**
13. **Yosbel Crespo** → Should be: **Yosbaldo Crespo Zamora**
14. **Claudio Garcia** → Should be: **Claudio Garcia camano**
15. **Linzy Vazquez** → Should be: **Linzy Vazquez rodriguez**
16. **Dayana Hernandez** → Should be: **Dayana Hernandez villa**
17. **Yair Oaxaca Lopez** → Should be: **Yair Oaxaca lopez**

### Incomplete Names (First Name Only - Need Full Name)
These appear as first names only in the CSV and need full names:
1. **Kaiya** → Should be: **Kaiya Ramos** (Leader from Buda)
2. **Monica** → Should be: **Monica Coniker** (Leader from Buda)
3. **Tim** → Should be: **Timothy Lane** (Leader from Buda)
4. **Carlos** → Should be: **Carlos Hermosillo** (Leader from Buda)
5. **Jason** → Should be: **Jason Luna** (Leader from Buda)
6. **Nayeli** → Should be: **Nayeli Rodriguez** (Leader from Buda)
7. **Angeles** → Should be: **Angeles Carbajal** (Leader from Buda)
8. **Jessica** → Should be: **Jessica Badejo** (Leader from Buda)

---

## WEST BUDA (05508) - Leader/Rater Name Mismatches

### Incomplete Names (First Name Only - Need Full Name)
These raters appear as first names only in the CSV and need full names:
1. **Nestor** → Should be: **Nestor Reyes** (Leader from Buda)
2. **Dom** → Should be: **Dominique Miller** (Leader from Buda)
3. **Daniel** → Should be: **Daniel Van Cleave** (Leader from Buda)
4. **Tim** → Should be: **Timothy Lane** (Leader from Buda)
5. **Kaiya** → Should be: **Kaiya Ramos** (Leader from Buda)
6. **Luke** → Should be: **Luke Kilstrom** (Leader from Buda)
7. **Ethan** → Should be: **Ethan Coniker** (Leader from Buda)
8. **Jessica** → Should be: **Jessica Badejo** (Leader from Buda)
9. **Carlos** → Should be: **Carlos Hermosillo** (Leader from Buda)
10. **Monica** → Should be: **Monica Coniker** (Leader from Buda)
11. **Kianna** → Should be: **Kianna Ramos** (Leader from Buda)
12. **Mina** → Should be: **Mina Tieu** (Leader from Buda)
13. **Vanessa** → Should be: **Vanessa Hicks** (Leader from Buda)
14. **Eli V** → Should be: **Elizabeth Vazquez** (Leader from Buda)
15. **Amanda** → Should be: **Amanda Luna** (Leader from Buda)
16. **Eric** → Should be: **Eric Reyna** (Leader from Buda)
17. **Angeles** → Should be: **Angeles Carbajal** (Leader from Buda)
18. **Doris** → NOT FOUND - Keep ratings recorded but with no rater id
19. **Bessie** → NOT FOUND - Keep ratings recorded but with no rater id
20. **Greyca** → NOT FOUND - Keep ratings recorded but with no rater id
21. **Jenny** → Should be: **Jenny Reyes Ramos** (Leader from Buda)
22. **Magali Rodriguez** → Should be: **Magali Rodriguez Barrera** (Leader from Buda)
23. **Brayan Castro** → Should be: **Brayan Castro Moreno** (Needs to be changed to Team Lead)
24. **Eli Garcia** → Should be: **Elizabeth Garcia** (Leader from Buda)

---

## Action Items

### For CSV Files:
1. **Update all first names to full names** for raters in West Buda CSV (05508_ratingsUpdate.csv)
2. **Fix spelling variations** listed above
3. **Remove or update** entries for employees that don't exist in the database
4. **Verify** employees marked as "NOT FOUND" - they may need to be added to the database or removed from CSV

### Priority Fixes:
- **High Priority**: All rater names in West Buda CSV need to be full names (not first names)
- **High Priority**: Fix "Kayden Humpherys" → "Kayden May" (appears multiple times)
- **High Priority**: Fix "Elena Rodriguez" entries in Buda CSV (9 occurrences) - verify if this person exists
- **Medium Priority**: Fix spelling variations (Cassandra→Casandra, Juliette→Julette, etc.)
- **Low Priority**: Investigate "NOT FOUND" employees - may need to be added to database

---

## Notes
- Raters can be from either location (Buda or West Buda) within the same organization
- Some names appear in both locations (e.g., "Reece Howard", "Traci Danmeyer-Rodgers")
- The script searches for raters across all locations in the org, so full names are required

