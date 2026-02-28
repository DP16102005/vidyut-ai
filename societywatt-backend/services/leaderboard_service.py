def recompute_leaderboard(society_id: str, db):
    """
    Called after every bill upload.
    Recomputes this society's rank at national, 
    city, and state level.
    """
    from models import Society, Bill, LeaderboardEntry
    from sqlalchemy import func
    import json
    import uuid
    
    society = db.query(Society).filter_by(
        id=society_id).first()
    if not society or not society.leaderboard_opt_in:
        return
    
    # Get this society's latest composite score
    latest_bill = (
        db.query(Bill)
        .filter_by(society_id=society_id,
                   processing_status='complete')
        .order_by(Bill.billing_period_from.desc())
        .first()
    )
    if not latest_bill:
        return
    
    try:
        ao = json.loads(latest_bill.analytics_output or '{}')
        my_score = ao.get('composite_score')
        my_intensity = ao.get('energy_intensity')
        my_co2e = ao.get('co2e_avoided_kg', 0)
        if my_score is None:
            return
    except:
        return
    
    # Determine verification tier based on data richness
    bill_count = db.query(Bill).filter_by(
        society_id=society_id,
        processing_status='complete').count()
    
    has_dg_data = ao.get('dg_total_hours', 0) > 0
    has_solar_data = ao.get(
        'solar_self_consumption_ratio') is not None
    
    if bill_count >= 6 and (has_dg_data or has_solar_data):
        tier = 'gold'
    elif bill_count >= 3:
        tier = 'silver'
    else:
        tier = 'bronze'
    
    # Compare vs same building_type at each level
    # to find rank position
    
    def get_rank(scope_field, scope_value):
        # Get all opt-in societies same building_type 
        # in this scope, with at least 1 bill
        from models import User
        
        scope_filter = (
            Society.city == scope_value 
            if scope_field == 'city'
            else Society.state == scope_value 
            if scope_field == 'state'
            else True  # national
        )
        
        peers = (
            db.query(Society)
            .filter(
                Society.building_type == society.building_type,
                Society.leaderboard_opt_in == True,
                scope_filter if scope_field != 'national' 
                    else Society.id.isnot(None)
            )
            .all()
        )
        
        # Get latest composite score for each peer
        peer_scores = []
        for p in peers:
            pb = (db.query(Bill)
                    .filter_by(society_id=p.id,
                               processing_status='complete')
                    .order_by(Bill.billing_period_from.desc())
                    .first())
            if pb:
                try:
                    pao = json.loads(pb.analytics_output or '{}')
                    ps = pao.get('composite_score')
                    if ps is not None:
                        peer_scores.append({
                            'society_id': p.id,
                            'score': ps
                        })
                except:
                    pass
        
        # Sort descending (higher score = better rank)
        peer_scores.sort(key=lambda x: x['score'], 
                         reverse=True)
        
        rank = next(
            (i+1 for i, p in enumerate(peer_scores) 
             if p['society_id'] == society_id),
            len(peer_scores)
        )
        return rank, len(peer_scores)
    
    # Compute improvement_pct vs 6 months ago
    old_bill = (
        db.query(Bill)
        .filter_by(society_id=society_id,
                   processing_status='complete')
        .order_by(Bill.billing_period_from.asc())
        .first()
    )
    improvement_pct = 0.0
    if old_bill and old_bill.id != latest_bill.id:
        try:
            old_ao = json.loads(old_bill.analytics_output or '{}')
            old_score = old_ao.get('composite_score', my_score)
            if old_score > 0:
                improvement_pct = round(
                    (my_score - old_score) / old_score * 100, 1)
        except:
            pass
    
    # Delete old entries for this society
    db.query(LeaderboardEntry).filter_by(
        society_id=society_id).delete()
    
    # Insert new entries for national, city, state
    levels = [
        ('national', 'national', 'India'),
        ('city',     'city',     society.city),
        ('state',    'state',    society.state),
    ]
    
    for level, scope_field, scope_value in levels:
        rank_pos, total = get_rank(scope_field, scope_value)
        entry = LeaderboardEntry(
            id=str(uuid.uuid4()),
            society_id=society_id,
            ranking_level=level,
            scope_value=scope_value,
            building_type=society.building_type,
            rank_position=rank_pos,
            total_in_category=total,
            composite_score=my_score,
            verification_tier=tier,
            energy_intensity=my_intensity or 0,
            improvement_pct=improvement_pct,
            co2e_avoided_kg=my_co2e,
        )
        db.add(entry)
    
    db.commit()
