# Setup

How to make your commits signed

Follow
https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits

Istall GPG suite

Create a new key and add it for your email (madsbak@outlook.com)
Save the password to the key

Export the public key, and upload it to github


Ensure all commits are signed
```bash
git config --global commit.gpgsign true
```

Set your GPG key
```bash
git config --global user.signingkey 51EA95F6
```

Make sure to set your git name and email
```bash
git config --global user.name "Mads Bak"
git config --global user.email "madsbak@outlook.com"
```

Then start signing your commits, and check on github if you have the 'verified' status for your commits



