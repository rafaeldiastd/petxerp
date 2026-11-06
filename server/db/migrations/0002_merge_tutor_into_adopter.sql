-- Adotante e tutor passam a ser um único tipo de pessoa ("adopter" = Adotante/tutor)
UPDATE "people"
SET "types" = ARRAY(SELECT DISTINCT unnest(array_replace("types", 'tutor', 'adopter')))
WHERE 'tutor' = ANY("types");
