use std::{
    cmp::{Ordering, PartialOrd},
    fmt::Display,
    ops::{Add, Div, Mul, Sub}, u128,
};

pub const SCALE: u128 = 1_000; // Scale factor, representing 3 decimal places

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct FixedPoint(u128);

impl FixedPoint {
    fn new(value: u64) -> Self {
        Self(value as u128)
    }

    fn to_u64(&self) -> u64 {
        self.0 as u64
    }

    // Static method to return "1.000" as a FixedPoint instance
    pub fn one() -> Self {
        FixedPoint(SCALE)
    }
}

impl Display for FixedPoint {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let integer_part = self.0 / SCALE;
        let fractional_part = self.0 % SCALE;
        write!(f, "{}.{:03}", integer_part, fractional_part)
    }
}

// Implement PartialOrd for FixedPoint to support comparison operators
impl PartialOrd for FixedPoint {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.0.cmp(&other.0))
    }
}

// Implement Ord for FixedPoint to support sorting and full ordering
impl Ord for FixedPoint {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.cmp(&other.0)
    }
}

// Implement Add trait for FixedPoint
impl Add for FixedPoint {
    type Output = FixedPoint;

    fn add(self, other: FixedPoint) -> FixedPoint {
        FixedPoint(self.0 + other.0)
    }
}

// Implement Sub trait for FixedPoint
impl Sub for FixedPoint {
    type Output = FixedPoint;

    fn sub(self, other: FixedPoint) -> FixedPoint {
        FixedPoint(self.0 - other.0)
    }
}

// Implement Mul trait for FixedPoint with another FixedPoint
impl Mul for FixedPoint {
    type Output = FixedPoint;

    fn mul(self, rhs: FixedPoint) -> FixedPoint {
        // To prevent scaling issues, multiply the values and then divide by SCALE to keep it in the same scale.
        FixedPoint((self.0 * rhs.0) / SCALE)
    }
}

// Implement Div trait for FixedPoint with another FixedPoint
impl Div for FixedPoint {
    type Output = FixedPoint;

    fn div(self, rhs: FixedPoint) -> FixedPoint {
        FixedPoint(self.0 * SCALE / rhs.0)
    }
}

// Implement conversion to u64
impl Into<u64> for FixedPoint {
    fn into(self) -> u64 {
        self.to_u64()
    }
}

// Implement conversion from u64
impl From<u64> for FixedPoint {
    fn from(value: u64) -> Self {
        FixedPoint::new(value)
    }
}

#[cfg(test)]
mod tests {
    use super::FixedPoint;
    use std::u64;

    const SCALE: u128 = 1_000;

    #[test]
    fn test_fixed_point_new() {
        let fp = FixedPoint::new(1500);
        assert_eq!(fp.0, 1500);
    }

    #[test]
    fn test_fixed_point_addition() {
        let a = FixedPoint::new(1000); // 1.000
        let b = FixedPoint::new(2500); // 2.500
        let sum = a + b; // Should be 3.500
        assert_eq!(sum.0, 3500);
    }

    #[test]
    fn test_fixed_point_subtraction() {
        let a = FixedPoint::new(2500); // 2.500
        let b = FixedPoint::new(1000); // 1.000
        let diff = a - b; // Should be 1.500
        assert_eq!(diff.0, 1500);
    }

    #[test]
    fn test_fixed_point_multiplication_with_decimal_fixed_point() {
        let a = FixedPoint::new(5000); // 5.000
        let b = FixedPoint::new(2); // 0.002
        let product = a * b; // Should be 10.000
        assert_eq!(product.0, 10);
    }

    #[test]
    fn test_fixed_point_division_with_small_numerator() {
        let a = FixedPoint::new(1250); // 1.250
        let b = FixedPoint::new(5000); // 5.000
        let div_result = a / b; // Should be 0.250
        assert_eq!(div_result.0, 250);
    }

    #[test]
    fn test_fixed_point_division_with_big_numerator() {
        let a = FixedPoint::new(5000); // 5.000
        let b = FixedPoint::new(1250); // 1.250
        let div_result = a / b; // Should be 4.00
        assert_eq!(div_result.0, 4000);
    }

    #[test]
    fn test_fixed_point_multiplication_with_fixed_point() {
        let a = FixedPoint::new(1500); // 1.500
        let b = FixedPoint::new(2000); // 2.000
        let product = a * b; // Should be 3.000
        assert_eq!(product.0, 3000);
    }

    #[test]
    fn test_conversion_to_u64() {
        let a = FixedPoint::new(1000); // 1.000
        let u64_val: u64 = a.into();
        assert_eq!(u64_val, 1000);
    }

    #[test]
    fn test_conversion_from_u64() {
        let a: FixedPoint = 2500.into(); // 2.500
        assert_eq!(a.0, 2500);
    }

    #[test]
    fn test_display_formatting() {
        let a = FixedPoint(1234 * SCALE + 567); // Represents 1234.567
        assert_eq!(format!("{}", a), "1234.567");
    }

    #[test]
    fn test_large_values() {
        let large_value = u64::MAX; // Maximum u64 value
        let fp = FixedPoint::new(large_value);
        assert_eq!(fp.to_u64(), large_value);
    }

    #[test]
    fn test_equality() {
        let a = FixedPoint::new(1000); // 1.000
        let b = FixedPoint::new(1000); // 1.000
        assert_eq!(a, b);
    }

    #[test]
    fn test_inequality() {
        let a = FixedPoint::new(1000); // 1.000
        let b = FixedPoint::new(2000); // 2.000
        assert!(a < b);
        assert!(b > a);
    }

    #[test]
    fn test_greater_than_or_equal() {
        let a = FixedPoint::new(1500); // 1.500
        let b = FixedPoint::new(1500); // 1.500
        let c = FixedPoint::new(2000); // 2.000
        assert!(b >= a);
        assert!(c >= a);
    }

    #[test]
    fn test_less_than_or_equal() {
        let a = FixedPoint::new(1500); // 1.500
        let b = FixedPoint::new(1500); // 1.500
        let c = FixedPoint::new(1000); // 1.000
        assert!(b <= a);
        assert!(c <= a);
    }
}
