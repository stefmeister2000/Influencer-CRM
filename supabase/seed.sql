-- Seed default categories + prompt templates for a given team.
-- Replace :team with the target team id, or run after creating your first user
-- (the team id is in public.teams).
--
-- Example:  psql ... -v team="'00000000-0000-0000-0000-000000000000'"

\set team '00000000-0000-0000-0000-000000000000'

insert into categories (team_id, name, slug, is_default) values
  (:team,'Hair loss','hair-loss',true),
  (:team,'Men''s health','mens-health',true),
  (:team,'Weight loss','weight-loss',true),
  (:team,'Fitness coach','fitness-coach',true),
  (:team,'Personal trainer','personal-trainer',true),
  (:team,'Gym owner','gym-owner',true),
  (:team,'Barber','barber',true),
  (:team,'Hair salon','hair-salon',true),
  (:team,'Beauty creator','beauty-creator',true),
  (:team,'Lifestyle creator','lifestyle-creator',true),
  (:team,'Mom/women''s wellness','women-wellness',true),
  (:team,'Medical professional','medical-professional',true),
  (:team,'Clinic','clinic',true),
  (:team,'Pharmacy','pharmacy',true),
  (:team,'Nutritionist','nutritionist',true),
  (:team,'Dietitian','dietitian',true),
  (:team,'Wellness page','wellness-page',true),
  (:team,'Transformation page','transformation-page',true),
  (:team,'Arabic creator','arabic-creator',true),
  (:team,'English creator','english-creator',true),
  (:team,'UAE expat creator','uae-expat-creator',true)
on conflict (team_id, slug) do nothing;

insert into prompt_templates (team_id, name, prompt, default_country, default_product, default_message_angle) values
  (:team,'UAE hair loss affiliates','Find UAE-based creators for hair loss outreach. Mostly men. Barbers, grooming pages, gym guys, lifestyle pages, Arabic and English, 5k to 100k followers, not celebrities, good for affiliate outreach.','UAE','hair_loss','premium online doctor-reviewed hair loss treatment'),
  (:team,'UAE men''s health creators','Find UAE male lifestyle and wellness creators aligned with confidence and men''s health. Dubai and Abu Dhabi, 5k-100k followers, clean premium look.','UAE','mens_health','discreet doctor-reviewed online men''s health care'),
  (:team,'Dubai barbers','Find Dubai barbers and men''s grooming pages with engaged local audiences, 3k-80k followers.','UAE','hair_loss','men''s confidence and hair support'),
  (:team,'Abu Dhabi fitness coaches','Find Abu Dhabi fitness coaches and personal trainers focused on transformation, 5k-100k followers.','UAE','weight_loss','doctor-reviewed weight management partnership'),
  (:team,'Arabic women''s wellness creators','Find UAE Arabic-speaking women''s wellness and lifestyle creators, family/health focus, 5k-100k followers.','UAE','wellness','modern discreet online care for wellness'),
  (:team,'Weight loss transformation pages','Find UAE weight loss and body transformation pages with authentic engagement.','UAE','weight_loss','tracked referral weight management partnership'),
  (:team,'Clinic owners','Find UAE aesthetic/wellness clinic owners and medical influencers open to partnerships.','UAE','mens_health','clinical partnership for online doctor-reviewed care')
on conflict do nothing;
